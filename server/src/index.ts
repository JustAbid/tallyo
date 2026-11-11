import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getSummary, listCustomers, listInvoices, listReplies } from './queries';
import { resetAndSeed, seedIfEmpty } from './seed';

seedIfEmpty();

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

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
