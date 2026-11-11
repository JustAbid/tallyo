import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'Tallyo', time: new Date().toISOString() });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Tallyo server listening on http://localhost:${port}`));
