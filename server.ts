import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Initialize Firebase Admin (Uses GOOGLE_APPLICATION_CREDENTIALS or default service account)
if (process.env.NODE_ENV === 'production') {
  initializeApp();
} else {
  // Mock initialization for local dev if needed, or require service account key
  try {
    initializeApp();
  } catch (e) {}
}

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

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

/**
 * Standard Resilient Content Generation with automated fallback ladder
 */
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
      // Continue to next model in the fallback ladder
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
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Admin Stats Endpoint
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      
      const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      // Aggregate stats securely
      const usersSnap = await getFirestore().collection('users').count().get();
      const totalUsers = usersSnap.data().count;

      res.json({ totalUsers, status: 'Active' });
    } catch (error: any) {
      console.error('Admin API error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Google Places Autocomplete Proxy
  app.get('/api/places/autocomplete', requireAuth, async (req, res) => {
    try {
      const { input } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'Google Maps API key not configured.' });
      }
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'Input query parameter is required.' });
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Places API error:', error);
      res.status(500).json({ error: 'Failed to fetch places.' });
    }
  });

  // Chat / Reflection Multi-turn endpoint
  app.post('/api/chat', requireAuth, async (req, res) => {
    try {
      // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { messages, mode = 'reflective', entryTitle = '' } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required and cannot be empty.' });
      }

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

      // Convert messages to sanitized Gemini format
      const formattedContents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '').slice(0, 8000) }],
      }));

      // Call Gemini with automated fallback ladder
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
      console.error('Error in /api/chat:', error);
      const isMissingKey = error.message?.includes('GEMINI_API_KEY');
      res.status(isMissingKey ? 503 : 500).json({
        error: isMissingKey
          ? 'Gemini API key is not configured. Please configure GEMINI_API_KEY in the environment settings.'
          : error.message || 'An error occurred while generating response.',
      });
    }
  });

  // Summarize / Generate Title and Insights endpoint
  app.post('/api/summarize', requireAuth, async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { messages, text } = body;

      let combinedContent = '';
      if (text) {
        combinedContent += String(text).slice(0, 4000);
      }
      if (Array.isArray(messages)) {
        combinedContent +=
          '\n' +
          messages
            .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${String(m.content || '').slice(0, 2000)}`)
            .join('\n');
      }

      if (!combinedContent.trim()) {
        return res.status(400).json({ error: 'No content provided for summarization.' });
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

      // Async External Notification Trigger
      if (process.env.EXTERNAL_WEBHOOK_URL) {
        // Fire and forget (Asynchronous Execution)
        setTimeout(() => {
          fetch(process.env.EXTERNAL_WEBHOOK_URL as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'reflection_synthesized',
              mood: parsed.mood || 'Unknown',
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.error('Webhook notification failed:', err));
        }, 0);
      }

      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/summarize:', error);
      res.status(500).json({
        error: error.message || 'Failed to generate summary.',
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Reflection Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
