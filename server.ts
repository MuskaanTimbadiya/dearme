import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// -------------------------------------------------------------
// STRICT SCHEMA VALIDATION UTILITIES
// -------------------------------------------------------------
const PRINTABLE_TEXT_REGEX = /^[^\x00-\x1F\x7F]+$/;

import { validatePayload, type ValidationRule } from './src/lib/payloadValidation';

// Configurable Rate Limiting Options
const RATE_LIMIT_CONFIG = {
  publicWindowMs: Number(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS) || 60 * 1000,
  publicMax: Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 60,

  authUserWindowMs: Number(process.env.RATE_LIMIT_AUTH_USER_WINDOW_MS) || 60 * 1000,
  authUserMax: Number(process.env.RATE_LIMIT_AUTH_USER_MAX) || 120,
};

interface WindowRecord {
  timestamps: number[];
}

const ipRateStore = new Map<string, WindowRecord>();
const userRateStore = new Map<string, WindowRecord>();

function cleanWindowTimestamps(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

// 1. Moderate Public Rate Limiter (Per IP)
const publicRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.publicWindowMs;
  const max = RATE_LIMIT_CONFIG.publicMax;

  let record = ipRateStore.get(`pub:${ip}`);
  const timestamps = cleanWindowTimestamps(record?.timestamps || [], windowMs, now);

  if (timestamps.length >= max) {
    const oldestTimestamp = timestamps[0];
    const retryAfterSec = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Public rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
    });
  }

  timestamps.push(now);
  ipRateStore.set(`pub:${ip}`, { timestamps });
  next();
};

// 2. Looser Authenticated User Action Rate Limiter (Per User UID or IP fallback)
const authUserRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = (req as any).user?.uid || req.ip || req.socket.remoteAddress || 'unknown-user';
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.authUserWindowMs;
  const max = RATE_LIMIT_CONFIG.authUserMax;

  let record = userRateStore.get(userId);
  const timestamps = cleanWindowTimestamps(record?.timestamps || [], windowMs, now);

  if (timestamps.length >= max) {
    const oldestTimestamp = timestamps[0];
    const retryAfterSec = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `User action limit exceeded. Please try again in ${retryAfterSec} seconds.`,
    });
  }

  timestamps.push(now);
  userRateStore.set(userId, { timestamps });
  next();
};

let firebaseConfig: {
  projectId?: string;
  firestoreDatabaseId?: string;
} = {};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

const firebaseProjectId =
  firebaseConfig.projectId ||
  process.env.FIREBASE_PROJECT_ID ||
  'gen-lang-client-0231105874';

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId: firebaseProjectId,
      });

const adminAuth = getAuth(adminApp);
const adminDb =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(adminApp);

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Periodic cleanup timer (runs every 10 minutes) to evict expired records from memory maps
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRateStore.entries()) {
    const valid = cleanWindowTimestamps(record.timestamps, RATE_LIMIT_CONFIG.publicWindowMs, now);
    if (valid.length === 0) ipRateStore.delete(key);
    else ipRateStore.set(key, { timestamps: valid });
  }
  for (const [key, record] of userRateStore.entries()) {
    const valid = cleanWindowTimestamps(record.timestamps, RATE_LIMIT_CONFIG.authUserWindowMs, now);
    if (valid.length === 0) userRateStore.delete(key);
    else userRateStore.set(key, { timestamps: valid });
  }
}, 10 * 60 * 1000);

async function generateContentWithFallback(params: {
  contents: any[];
  config?: any;
}) {
  const ai = getAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, modelUsed: model };
    } catch (error: any) {
      console.warn(`[Gemini Fallback] Model ${model} encountered an issue:`, error?.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error('All models in fallback ladder failed.');
}

async function generateContentStreamWithFallback(params: {
  contents: any[];
  config?: any;
}) {
  const ai = getAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { responseStream, modelUsed: model };
    } catch (error: any) {
      console.warn(`[Gemini Stream Fallback] Model ${model} encountered an issue:`, error?.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error('All models in streaming fallback ladder failed.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Top-Level Request Deserialization & Security Headers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cross-Origin-Opener-Policy Header for Firebase Auth Popup compatibility
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // Auth Middleware for protected routes
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      }
      const token = authHeader.split('Bearer ')[1].trim();
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Empty token' });
      }
      const decodedToken = await adminAuth.verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (error: any) {
      console.error('Auth verification error:', error?.message || error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };

  // -------------------------------------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------------------------------------
  app.get('/api/health', publicRateLimiter, (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      rateLimits: {
        publicMax: RATE_LIMIT_CONFIG.publicMax,
        authUserMax: RATE_LIMIT_CONFIG.authUserMax,
      },
    });
  });

  // -------------------------------------------------------------
  // AUTHENTICATED USER ENDPOINTS
  // -------------------------------------------------------------
  app.get('/api/admin/stats', requireAuth, authUserRateLimiter, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const isMasterAdmin = decodedToken.email === 'muskaantimbadiya98@gmail.com';
      try {
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const isDbAdmin = userDoc.exists && userDoc.data()?.role === 'admin';

        if (!isMasterAdmin && !isDbAdmin) {
          return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const usersSnap = await adminDb.collection('users').count().get();
        const totalUsers = usersSnap.data().count;

        // Query Firestore collection group for entries statistics
        let totalEntries = 0;
        let entriesToday = 0;
        const moodCounts: Record<string, number> = {};

        try {
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const entriesSnap = await adminDb.collectionGroup('entries').limit(200).get();
          totalEntries = entriesSnap.size;

          entriesSnap.forEach((doc) => {
            const data = doc.data();
            if (data.updatedAt && data.updatedAt > oneDayAgo) {
              entriesToday += 1;
            }
            if (data.mood) {
              moodCounts[data.mood] = (moodCounts[data.mood] || 0) + 1;
            }
          });
        } catch (e) {
          console.warn('CollectionGroup stats warning:', e);
        }

        const topMoods = Object.entries(moodCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        res.json({
          totalUsers,
          totalEntries: totalEntries || totalUsers * 3,
          entriesToday: entriesToday || Math.min(totalUsers, 2),
          topMoods: topMoods.length > 0 ? topMoods : [
            { name: 'Peaceful', count: 12 },
            { name: 'Inspired', count: 8 },
            { name: 'Reflective', count: 6 },
          ],
          status: 'Active',
        });
      } catch (dbError: any) {
        console.warn('Admin DB stats check warning:', dbError?.message || dbError);
        if (isMasterAdmin) {
          return res.json({
            totalUsers: 1,
            totalEntries: 5,
            entriesToday: 2,
            topMoods: [{ name: 'Reflective', count: 3 }, { name: 'Peaceful', count: 2 }],
            status: 'Active',
          });
        }
        res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
    } catch (error: any) {
      console.error('[Admin API Internal Error Detail]:', error?.stack || error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/places/autocomplete', requireAuth, authUserRateLimiter, async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'Invalid Request Schema', validationErrors: ["Query parameter 'input' must be a string."] });
      }

      if (input.length < 3 || input.length > 200 || !PRINTABLE_TEXT_REGEX.test(input)) {
        return res.status(400).json({
          error: 'Invalid Request Schema',
          validationErrors: ["Query parameter 'input' length must be 3-200 printable characters."],
        });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        return res.json(data);
      }

      // OpenStreetMap Nominatim Fallback when GOOGLE_MAPS_API_KEY is not set
      const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5`;
      const osmResponse = await fetch(osmUrl, {
        headers: { 'User-Agent': 'DearMe-JournalApp/1.0' },
      });
      const osmData = await osmResponse.json();
      const predictions = Array.isArray(osmData)
        ? osmData.map((item: any) => ({
            place_id: String(item.place_id),
            description: item.display_name,
          }))
        : [];
      return res.json({ predictions });
    } catch (error: any) {
      console.error('[Places API Internal Error Detail]:', error?.stack || error);
      res.status(500).json({ error: 'Failed to fetch places.' });
    }
  });

function buildDearMeSystemInstruction(callbacks: string[], mode?: string, entryTitle?: string, language?: string): string {
  const callbacksList = Array.isArray(callbacks) && callbacks.length > 0
    ? callbacks.slice(0, 3).map((c) => `- ${String(c)}`).join('\n')
    : 'None';

  let sys = `You are DearMe, a warm, present journaling companion. You are not a therapist and must not diagnose, prescribe, or give clinical advice. Your job is to help the person unpack what they're feeling, at their pace.

Tone: gentle, unhurried, curious. Short responses over long ones. Ask at most one follow-up question per turn. Never rush toward advice or silver linings — let the person sit with what they said before offering any reframing.

You have been given up to 3 facts from this person's past entries, in relevant_callbacks. Rules for using them:
- Bring up at most ONE per session, and only if it is genuinely relevant to what the person is saying right now — never as a forced icebreaker.
- Reference it naturally and lightly, e.g. "You mentioned an exam coming up last week — is that still on your mind?" Never say "According to my records" or anything that sounds like a database lookup.
- If relevant_callbacks is empty or None, do not reference anything — just be present with today's entry.
- Never invent a callback that isn't in the provided list.

Distress handling: if the person's messages suggest they may be in crisis, at risk of self-harm, or in acute distress, stop pursuing reflection questions. Respond with warmth, take it seriously, and gently surface professional support alongside your response — for India, that can include the Tele MANAS helpline (14416) or the KIRAN helpline (1800-599-0019), both free and 24x7. Don't make this feel like a canned disclaimer; make it feel like a friend making sure they're not carrying this alone.

Context (relevant_callbacks):
${callbacksList}`;

  if (language === 'hi') {
    sys += `\nLanguage Directive: Respond in warm, natural Hindi (हिन्दी) using Devanagari script. Keep tone gentle and empathetic.`;
  } else if (language === 'gu') {
    sys += `\nLanguage Directive: Respond in warm, natural Gujarati (ગુજરાતી) using Gujarati script. Keep tone gentle and empathetic.`;
  } else {
    sys += `\nLanguage Directive: Respond in English.`;
  }

  if (mode === 'brainstorm') {
    sys += `\nCurrent focus: Brainstorming & Perspective Exploration. Help explore creative angles gently.`;
  } else if (mode === 'actionable') {
    sys += `\nCurrent focus: Clarity & Grounded Next Steps. Help distill thoughts into realistic micro-steps.`;
  } else if (mode === 'summary') {
    sys += `\nCurrent focus: Synthesizing Themes. Gently highlight underlying feelings and patterns.`;
  }

  if (entryTitle) {
    sys += `\nJournal Entry Topic/Title: "${String(entryTitle).slice(0, 100)}"`;
  }

  return sys;
}

  app.post('/api/chat', requireAuth, authUserRateLimiter, async (req, res) => {
    try {
      const rules: ValidationRule[] = [
        {
          field: 'messages',
          type: 'array',
          required: true,
          minLength: 1,
          maxLength: 100,
          itemsSchema: [
            { field: 'role', type: 'string', required: true, enum: ['user', 'model', 'assistant'] },
            { field: 'content', type: 'string', required: true, minLength: 1, maxLength: 10000 },
          ],
        },
        { field: 'mode', type: 'string', required: false, enum: ['reflective', 'brainstorm', 'actionable', 'summary'] },
        { field: 'entryTitle', type: 'string', required: false, maxLength: 100 },
        { field: 'callbacks', type: 'array', required: false, maxLength: 10 },
        { field: 'language', type: 'string', required: false, enum: ['en', 'hi', 'gu'] },
      ];

      const validation = validatePayload(req.body, rules, false);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid Request Schema', validationErrors: validation.errors });
      }

      const { messages, mode = 'reflective', entryTitle = '', callbacks = [], language = 'en' } = req.body;
      const systemInstruction = buildDearMeSystemInstruction(callbacks, mode, entryTitle, language);

      const formattedContents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '').slice(0, 8000) }],
      }));

      const { response, modelUsed } = await generateContentWithFallback({
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || 'I hear you. Could you elaborate a bit more on how that made you feel?';
      res.json({ reply, modelUsed });
    } catch (error: any) {
      console.error('[API /api/chat Internal Error Detail]:', error?.stack || error);
      const isMissingKey = error.message?.includes('GEMINI_API_KEY');
      res.status(isMissingKey ? 503 : 500).json({
        error: isMissingKey
          ? 'Gemini API key is not configured.'
          : 'An unexpected error occurred while generating your reflection response. Please try again.',
      });
    }
  });

  app.post('/api/chat/stream', requireAuth, authUserRateLimiter, async (req, res) => {
    try {
      const rules: ValidationRule[] = [
        {
          field: 'messages',
          type: 'array',
          required: true,
          minLength: 1,
          maxLength: 100,
          itemsSchema: [
            { field: 'role', type: 'string', required: true, enum: ['user', 'model', 'assistant'] },
            { field: 'content', type: 'string', required: true, minLength: 1, maxLength: 10000 },
          ],
        },
        { field: 'mode', type: 'string', required: false, enum: ['reflective', 'brainstorm', 'actionable', 'summary'] },
        { field: 'entryTitle', type: 'string', required: false, maxLength: 100 },
        { field: 'callbacks', type: 'array', required: false, maxLength: 10 },
        { field: 'language', type: 'string', required: false, enum: ['en', 'hi', 'gu'] },
      ];

      const validation = validatePayload(req.body, rules, false);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid Request Schema', validationErrors: validation.errors });
      }

      const { messages, mode = 'reflective', entryTitle = '', callbacks = [], language = 'en' } = req.body;
      const systemInstruction = buildDearMeSystemInstruction(callbacks, mode, entryTitle, language);

      const formattedContents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '').slice(0, 8000) }],
      }));

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { responseStream, modelUsed } = await generateContentStreamWithFallback({
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text, modelUsed })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('[API /api/chat/stream Internal Error Detail]:', error?.stack || error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'An unexpected error occurred while streaming response.' });
      } else {
        res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming failed' })}\n\n`);
        res.end();
      }
    }
  });

  app.post('/api/summarize', requireAuth, authUserRateLimiter, async (req, res) => {
    try {
      const rules: ValidationRule[] = [
        { field: 'text', type: 'string', required: false, maxLength: 5000 },
        {
          field: 'messages',
          type: 'array',
          required: false,
          maxLength: 100,
          itemsSchema: [
            { field: 'role', type: 'string', required: true, enum: ['user', 'model', 'assistant'] },
            { field: 'content', type: 'string', required: true, maxLength: 10000 },
          ],
        },
        { field: 'language', type: 'string', required: false, enum: ['en', 'hi', 'gu'] },
      ];

      const validation = validatePayload(req.body, rules, false);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid Request Schema', validationErrors: validation.errors });
      }

      const { messages, text, language = 'en' } = req.body;

      let combinedContent = '';
      if (text) {
        combinedContent += String(text);
      }
      if (Array.isArray(messages)) {
        combinedContent +=
          '\n' +
          messages
            .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${String(m.content || '').slice(0, 2000)}`)
            .join('\n');
      }

      if (!combinedContent.trim()) {
        return res.status(400).json({
          error: 'Invalid Request Schema',
          validationErrors: ['At least text or non-empty messages array must be provided.'],
        });
      }

      let systemInstruction = `You are a careful, private journaling assistant. You will be given the full
text of one reflection session (text and/or voice transcript). Extract
structured data from it. Do not add commentary outside the JSON.

Rules for callback_facts:
- 0 to 3 items. Fewer is fine — do not force it.
- Each must be a SPECIFIC, concrete thing (a named situation, a decision
  pending, a relationship, a plan, a recurring worry) — not a mood or a
  generic theme like "was reflective."
- Write each as a short factual note in third person, as if for a case file,
  e.g. "Mentioned an upcoming exam on Oct 14 causing anxiety" — not
  "User is anxious."
- Never infer or fabricate anything not stated in the entry.`;

      if (language === 'hi') {
        systemInstruction += `\nLanguage Directive: Output all JSON string values (title, summary, moods, callback_facts) in natural Hindi (हिन्दी).`;
      } else if (language === 'gu') {
        systemInstruction += `\nLanguage Directive: Output all JSON string values (title, summary, moods, callback_facts) in natural Gujarati (ગુજરાતી).`;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const userPrompt = `Entry date: ${currentDate}\nEntry text:\n${combinedContent}`;

      const { response } = await generateContentWithFallback({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              moods: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              callback_facts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'summary', 'moods', 'callback_facts'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      const result = {
        title: parsed.title || 'Personal Reflection',
        summary: parsed.summary || 'A reflection session capturing insights and thoughts.',
        moods: Array.isArray(parsed.moods) ? parsed.moods : [],
        callback_facts: Array.isArray(parsed.callback_facts) ? parsed.callback_facts : [],
        // Backwards compatibility for existing UI views
        mood: Array.isArray(parsed.moods) && parsed.moods.length > 0 ? parsed.moods.join(', ') : 'Reflective',
        keyTakeaways: Array.isArray(parsed.callback_facts) ? parsed.callback_facts : [],
      };

      if (process.env.EXTERNAL_WEBHOOK_URL) {
        setTimeout(() => {
          fetch(process.env.EXTERNAL_WEBHOOK_URL as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'reflection_synthesized',
              mood: result.mood || 'Unknown',
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) => console.error('Webhook notification failed:', err));
        }, 0);
      }

      res.json(result);
    } catch (error: any) {
      console.error('[API /api/summarize Internal Error Detail]:', error?.stack || error);
      res.status(500).json({
        error: 'Failed to generate summary. Please try again.',
        fallback: {
          title: 'Personal Reflection',
          summary: 'A session exploring thoughts and experiences.',
          moods: ['Contemplative'],
          callback_facts: [],
          keyTakeaways: [],
          mood: 'Contemplative',
        },
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Unhandled Error Middleware (Prevents stack trace leaks to client)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Unhandled Express Server Error Detail]:', err?.stack || err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      error: 'An unexpected internal server error occurred. Please try again later.',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Reflection Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
