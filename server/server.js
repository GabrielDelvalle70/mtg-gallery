import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import scryfallRouter from './src/routes/scryfall.js';
import authRouter from './src/routes/auth.js';
import collectionRouter from './src/routes/collection.js';
import wishlistRouter from './src/routes/wishlist.js';
import decksRouter from './src/routes/decks.js';
import geocodeRouter from './src/routes/geocode.js';
import overpassRouter from './src/routes/overpass.js';
import { rateLimit } from './src/middleware/rateLimit.js';
import { backfillCardNames } from './src/db/backfillNames.js';

if (!process.env.JWT_SECRET) {
  console.error('[mtg-gallery] FATAL: JWT_SECRET no está definido. Ver server/.env');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const app = express();

app.use(cors({ origin: true, credentials: false }));
app.use(express.json());
app.use(rateLimit({ windowMs: 1000, max: 120 }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/decks', decksRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/overpass', overpassRouter);
app.use('/api/scryfall', scryfallRouter);

if (isProd) {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[mtg-gallery] server listening on http://localhost:${PORT}`);
  // Backfill best-effort de nombres de cartas en colecciones previas a la migración.
  // No bloquea el arranque; si falla (red/cert) se reintenta en el próximo boot.
  backfillCardNames()
    .then(({ resolved, total }) => {
      if (total > 0) console.log(`[mtg-gallery] backfill de nombres: ${resolved}/${total} cartas`);
    })
    .catch((err) => console.warn('[mtg-gallery] backfill de nombres falló (se reintenta al próximo boot):', err.message));
});
