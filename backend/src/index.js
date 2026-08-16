import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import subjectsRouter from './routes/subjects.js';
import absencesRouter from './routes/absences.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/subjects', requireAuth, subjectsRouter);
app.use('/api/absences', requireAuth, absencesRouter);

// Also protect /api/auth/me and /api/auth/me PATCH
app.use('/api/auth/me', requireAuth);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

async function main() {
  let retries = 10;
  while (retries > 0) {
    try {
      await initDb();
      break;
    } catch (e) {
      retries--;
      console.log(`DB not ready, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
}

main();
