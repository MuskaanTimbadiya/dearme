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

interface ValidationRule {
  field: string;
  type: 'string' | 'array' | 'object' | 'number' | 'boolean';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  itemsSchema?: ValidationRule[];
}

function validatePayload(
  data: any,
  rules: ValidationRule[],
  allowUnknownKeys = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request payload must be a JSON object.'] };
  }

  const allowedKeys = new Set(rules.map((r) => r.field));
  if (!allowUnknownKeys) {
    const unknownKeys = Object.keys(data).filter((k) => !allowedKeys.has(k));
    if (unknownKeys.length > 0) {
      errors.push(`Unexpected properties not allowed in strict schema: ${unknownKeys.join(', ')}.`);
    }
  }

  for (const rule of rules) {
    const val = data[rule.field];

    if (val === undefined || val === null || val === '') {
      if (rule.required) {
        errors.push(`Field '${rule.field}' is required.`);
      }
      continue;
    }

    if (rule.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push(`Field '${rule.field}' must be an array.`);
        continue;
      }
      if (rule.minLength !== undefined && val.length < rule.minLength) {
        errors.push(`Field '${rule.field}' array length must be at least ${rule.minLength}.`);
      }
      if (rule.maxLength !== undefined && val.length > rule.maxLength) {
        errors.push(`Field '${rule.field}' array length cannot exceed ${rule.maxLength}.`);
      }

      if (rule.itemsSchema) {
        val.forEach((item: any, idx: number) => {
          const subValidation = validatePayload(item, rule.itemsSchema!, allowUnknownKeys);
          if (!subValidation.valid) {
            subValidation.errors.forEach((e) =>
              errors.push(`Field '${rule.field}[${idx}]': ${e}`)
            );
          }
        });
      }
    } else if (rule.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`Field '${rule.field}' must be a string.`);
        continue;
      }
      if (rule.minLength !== undefined && val.length < rule.minLength) {
        errors.push(`Field '${rule.field}' length must be at least ${rule.minLength} characters.`);
      }
      if (rule.maxLength !== undefined && val.length > rule.maxLength) {
        errors.push(`Field '${rule.field}' length cannot exceed ${rule.maxLength} characters.`);
      }
      if (rule.pattern && !rule.pattern.test(val)) {
        errors.push(`Field '${rule.field}' does not match the required format.`);
      }
      if (rule.enum && !rule.enum.includes(val)) {
        errors.push(`Field '${rule.field}' must be one of: ${rule.enum.join(', ')}.`);
      }
    } else {
      if (typeof val !== rule.type) {
        errors.push(`Field '${rule.field}' must be of type ${rule.type}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

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
      try {
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const usersSnap = await adminDb.collection('users').count().get();
        const totalUsers = usersSnap.data().count;

        res.json({ totalUsers, status: 'Active' });
      } catch (dbError: any) {
        console.warn('Admin DB stats check:', dbError?.message);
        res.json({ totalUsers: 1, status: 'Active' });
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
      if (!apiKey) {
        return res.status(503).json({ error: 'Google Maps API key not configured.' });
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('[Places API Internal Error Detail]:', error?.stack || error);
      res.status(500).json({ error: 'Failed to fetch places.' });
    }
  });

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
      ];

      const validation = validatePayload(req.body, rules, false);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid Request Schema', validationErrors: validation.errors });
      }

      const { messages, mode = 'reflective', entryTitle = '' } = req.body;

      let systemInstruction = `You are a thoughtful, empathetic, and insightful AI Reflection Companion and Journal Guide.
Your purpose is to help the user unpack their thoughts, feelings, plans, and experiences with clarity and warmth.

Tone and style:
- Empathetic, supportive, constructive, and grounded.
- Avoid generic cliches or unsolicited patronizing advice.
- When the user shares something deep or challenging, validate their perspective before gently offering reframing or reflective questions.
- Format responses clearly with markdown formatting (bullet points, clear paragraphs, bold emphasis where helpful).`;

      if (mode === 'brainstorm') {
        systemInstruction += `\nCurrent focus: Brainstorming & Perspective Exploration. Help the user explore diverse angles, creative alternatives, unexpected possibilities, and creative solutions.`;
      } else if (mode === 'actionable') {
        systemInstruction += `\nCurrent focus: Clarity & Actionable Next Steps. Help distill the user's thoughts into clear, realistic micro-steps, boundaries, or practical experiments.`;
      } else if (mode === 'summary') {
        systemInstruction += `\nCurrent focus: Synthesizing & Core Themes. Help identify underlying emotional patterns, recurring themes, and core insights from what they wrote.`;
      } else {
        systemInstruction += `\nCurrent focus: Gentle Socratic Reflection. Encourage deeper self-awareness, ask 1-2 open-ended reflective questions, and highlight positive moments or growth edges.`;
      }

      if (entryTitle) {
        systemInstruction += `\nJournal Entry Topic/Title: "${String(entryTitle).slice(0, 100)}"`;
      }

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
      ];

      const validation = validatePayload(req.body, rules, false);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid Request Schema', validationErrors: validation.errors });
      }

      const { messages, text } = req.body;

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

      const prompt = `Analyze this personal reflection/journal conversation and provide a structured summary.
Content:
${combinedContent}

Return a clean JSON object with:
1. "title": A meaningful, poetic or descriptive title for this journal entry (max 6-8 words).
2. "summary": A compassionate 2-3 sentence overview capturing the essence of the reflection.
3. "keyTakeaways": An array of 2 to 4 concise bullet points of core insights, realizations, or takeaways.
4. "mood": A single descriptive mood tag (e.g. "Grateful & Grounded", "Contemplative", "Energized", "Processing Change", "Focused", "Hopeful").`;

      const { response } = await generateContentWithFallback({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              mood: { type: Type.STRING },
            },
            required: ['title', 'summary', 'keyTakeaways', 'mood'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      if (process.env.EXTERNAL_WEBHOOK_URL) {
        setTimeout(() => {
          fetch(process.env.EXTERNAL_WEBHOOK_URL as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'reflection_synthesized',
              mood: parsed.mood || 'Unknown',
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) => console.error('Webhook notification failed:', err));
        }, 0);
      }

      res.json(parsed);
    } catch (error: any) {
      console.error('[API /api/summarize Internal Error Detail]:', error?.stack || error);
      res.status(500).json({
        error: 'Failed to generate summary. Please try again.',
        fallback: {
          title: 'Personal Reflection',
          summary: 'A session exploring thoughts and experiences.',
          keyTakeaways: ['Reflected on personal insights'],
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
