import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

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
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro',
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Chat / Reflection Multi-turn endpoint
  app.post('/api/chat', async (req, res) => {
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
  app.post('/api/summarize', async (req, res) => {
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
