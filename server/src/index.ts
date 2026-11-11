import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzePending, analyzeReply, draftNudge } from './ai';
import { GeminiError, geminiConfigured } from './gemini';
import { llmHandler } from './llmProxy';
import { paypalRouter, webhookHandler } from './paypalRoutes';
import { getSummary, listCustomers, listInvoices, listReplies } from './queries';
import { resetAndSeed, seedIfEmpty } from './seed';

seedIfEmpty();

const app = express();

// If the server is ever reached through a public tunnel (needed for PayPal webhooks),
// only the webhook route may be used. Everything else stays local-only.
app.use((req, res, next) => {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(req.headers.host ?? '');
  if (!local && req.path !== '/api/paypal/webhook') return res.status(404).end();
  next();
});

app.use(cors({ origin: 'http://localhost:5173' }));

// The webhook needs the untouched request body to check PayPal's signature.
app.post('/api/paypal/webhook', express.raw({ type: '*/*' }), webhookHandler);

// Agent turns carry tool descriptions and history, so this route accepts a larger body.
app.post('/api/llm', express.json({ limit: '4mb' }), llmHandler);

app.use(express.json());
app.use('/api/paypal', paypalRouter);

const aiFail = (res: express.Response, e: unknown) =>
  res.status(e instanceof GeminiError ? 502 : 400).json({ error: e instanceof Error ? e.message : String(e) });

app.get('/api/ai/status', (_req, res) => res.json({ keyPresent: geminiConfigured(), model: process.env.AI_MODEL || 'gemini-3.5-flash-lite' }));

app.post('/api/replies/analyze-pending', async (_req, res) => {
  try {
    res.json(await analyzePending());
  } catch (e) {
    aiFail(res, e);
  }
});

app.post('/api/replies/:id/analyze', async (req, res) => {
  try {
    res.json(await analyzeReply(Number(req.params.id)));
  } catch (e) {
    aiFail(res, e);
  }
});

app.post('/api/invoices/:id/nudge', async (req, res) => {
  try {
    res.json(await draftNudge(Number(req.params.id)));
  } catch (e) {
    aiFail(res, e);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'Tallyo', time: new Date().toISOString() });
});

app.get('/api/invoices', (_req, res) => res.json(listInvoices()));
app.get('/api/customers', (_req, res) => res.json(listCustomers()));
app.get('/api/replies', (_req, res) => res.json(listReplies()));
app.get('/api/summary', (_req, res) => res.json(getSummary()));

app.post('/api/demo/reset', (_req, res) => {
  resetAndSeed();
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Tallyo server listening on http://localhost:${port}`));
