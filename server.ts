import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { GoogleGenAI, type Content, type GenerateContentResponse } from '@google/genai';

const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
const ALLOWED_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);

type RolePreset = 'academic' | 'library' | 'portal';

interface IncomingHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

interface SiteContextPayload {
  brandTitle?: string;
  examTitle?: string;
  examDate?: string;
  viewMode?: 'public' | 'portal';
  portalPage?: string;
  userRoleLevel?: string;
  classesRange?: string;
  stats?: {
    totalStudents?: number;
    totalRooms?: number;
    totalBooks?: number;
    totalNotices?: number;
  };
}

interface ChatRequestBody {
  message?: string;
  history?: IncomingHistoryMessage[];
  rolePreset?: RolePreset;
  model?: string;
  siteContext?: SiteContextPayload;
}

function buildSystemInstruction(rolePreset: RolePreset, ctx?: SiteContextPayload): string {
  const brand = ctx?.brandTitle || 'PROYASH (প্রয়াস)';
  const examTitle = ctx?.examTitle || 'Merit Scholarship Examination';
  const examDate = ctx?.examDate || 'Scheduled Exam Date';
  const contextLines = [
    `Organization: ${brand}.`,
    `Primary Examination: ${examTitle} (Date: ${examDate}) for Classes II to X (II–X).`,
    ctx?.viewMode === 'portal'
      ? `Current Workspace: Staff Management Portal (Active module: ${ctx.portalPage || 'dashboard'}, User role level: ${ctx.userRoleLevel || 'Staff'}).`
      : 'Current Workspace: Public Institutional Website.',
    ctx?.stats
      ? `Current institutional counts: ${ctx.stats.totalStudents ?? 0} registered students, ${ctx.stats.totalRooms ?? 0} exam rooms, ${ctx.stats.totalBooks ?? 0} library books, ${ctx.stats.totalNotices ?? 0} active notices.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const rolePersonas: Record<RolePreset, string> = {
    academic: `You are the ${brand} Academic & Examination Guide.
Your role is to assist students, guardians, and teachers with:
- Merit Scholarship Examination rules, Class II–X eligibility, registration workflow, photo requirements, admit card / roll lookup, and result verification.
- Study tips, subject preparation advice, and time management for Classes II to X.
Keep answers clear, structured, encouraging, and concise.`,
    library: `You are the ${brand} Library & Reading Assistant.
Your role is to assist community learners and students (Classes II to X) with:
- Explaining library borrowing rules, book reservations, and study habits.
- Recommending Bengali and English literature, science, mathematics, and general knowledge topics suitable for Class II to Class X students.
Keep answers warm, practical, and easy to read.`,
    portal: `You are the ${brand} Portal Operations Helper.
Your role is to guide authorized portal staff (Super Admin, Admin, Manager, and Member roles) through portal workflows:
- Role-Based Access Control (Super Admin: full control & DB reset; Admin/Sub Admin: permanent deletes, Admin-locked homepage edits, picture box setup, and Admin-only password changes for members/staff; Manager: operational updates, content permanent saves, Member assignments without deletions or password changes; Member: assigned modules only).
- Room Management: filtering students by Class II–X, multi-select checkboxes, bulk room & sequential seat assignment, and appointing room guards.
- Gatekeeper Entry Tick: searching by Roll, Reg ID, Name, or Student Class (II–X) and marking entry ticks.
- Group Message Box: sending and resolving alerts across Admin Group, Manager Group, Guard & Room Alerts, and General Staff.
- Excel Import/Export and Permanent Save controls across Notice, About Us, Contact, Student Data, and Homepage Editor.
Provide concise step-by-step guidance without inventing nonexistent features.`,
  };

  const persona = rolePersonas[rolePreset] || rolePersonas.academic;
  return `${persona}\n\nInstitutional Context:\n${contextLines}\n\nAlways reply accurately in helpful plain markdown or crisp bullet points. Never ask the user for API keys or expose internal configuration.`;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function sendWithRetry(
  fn: () => Promise<GenerateContentResponse>,
  retries = 1
): Promise<GenerateContentResponse> {
  try {
    return await fn();
  } catch (err) {
    const status =
      typeof (err as { status?: number })?.status === 'number'
        ? (err as { status: number }).status
        : 500;
    if (retries > 0 && (status === 500 || status === 503)) {
      await new Promise((r) => setTimeout(r, 600));
      return sendWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as ChatRequestBody;
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) {
        res.status(400).json({ error: 'Message text is required.' });
        return;
      }

      const rolePreset: RolePreset =
        body.rolePreset === 'library' || body.rolePreset === 'portal'
          ? body.rolePreset
          : 'academic';

      const requestedModel = typeof body.model === 'string' ? body.model : 'gemini-4-hydrogen';
      const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gemini-4-hydrogen';

      const sdkHistory: Content[] = Array.isArray(body.history)
        ? body.history
            .filter(
              (item): item is IncomingHistoryMessage =>
                Boolean(item) &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim().length > 0
            )
            .slice(-24)
            .map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            }))
        : [];

      const ai = getGeminiClient();
      const systemInstruction = buildSystemInstruction(rolePreset, body.siteContext);

      const chat = ai.chats.create({
        model,
        history: sdkHistory,
        config: {
          systemInstruction,
        },
      });

      const response = await sendWithRetry(() => chat.sendMessage({ message }));
      const replyText = (response.text || '').trim();

      if (!replyText) {
        res.status(502).json({ error: 'The assistant returned an empty response. Please try again.' });
        return;
      }

      res.json({
        reply: replyText,
        model,
        rolePreset,
      });
    } catch (error) {
      const e = error as Error & { status?: number; statusCode?: number };
      const statusCode =
        typeof e.statusCode === 'number'
          ? e.statusCode
          : typeof e.status === 'number'
            ? e.status
            : 500;

      let errorMessage = e.message || 'Failed to get response from Gemini API.';
      if (statusCode === 401 || statusCode === 403 || errorMessage.includes('API_KEY_INVALID')) {
        errorMessage =
          'Invalid or unauthorized Gemini API key. Please check your key in the Settings > Secrets panel.';
      } else if (statusCode === 429 || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage =
          'Rate limit or quota reached for the Gemini API key. Please wait a moment or check quota in Settings > Secrets.';
      }

      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: errorMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PROYASH full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
