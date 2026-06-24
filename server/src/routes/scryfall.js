import { Router } from 'express';
import { cacheMiddleware } from '../middleware/cache.js';

const SCRYFALL_BASE = 'https://api.scryfall.com';
const DEFAULT_TTL = 5 * 60 * 1000;

const router = Router();
router.use(cacheMiddleware({ ttlMs: DEFAULT_TTL }));

async function proxy(req, res, next, pathBuilder, init) {
  try {
    const url = pathBuilder(req);
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'mtg-gallery/1.0 (+local)',
        ...(init?.headers || {}),
      },
      method: init?.method || 'GET',
      body: init?.body,
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    res.status(response.status).json(body);
  } catch (err) {
    next(err);
  }
}

router.get('/search', (req, res, next) => {
  proxy(req, res, next, () => {
    const params = new URLSearchParams();
    if (req.query.q) params.set('q', String(req.query.q));
    if (req.query.order) params.set('order', String(req.query.order));
    if (req.query.dir) params.set('dir', String(req.query.dir));
    if (req.query.page) params.set('page', String(req.query.page));
    if (req.query.unique) params.set('unique', String(req.query.unique));
    if (req.query.include_extras) params.set('include_extras', String(req.query.include_extras));
    return `${SCRYFALL_BASE}/cards/search?${params.toString()}`;
  });
});

// POST /collection — bulk lookup. Body: { identifiers: [{ id }, ...] } (máx 75 por
// request, límite de Scryfall). El cliente batchea; acá sólo proxeamos. No se cachea
// (el cacheMiddleware es GET-only) — es POST y los IDs varían por usuario.
router.post('/collection', (req, res, next) => {
  const identifiers = Array.isArray(req.body?.identifiers) ? req.body.identifiers : null;
  if (!identifiers || identifiers.length === 0) {
    return res.status(400).json({ error: 'identifiers (array no vacío) es requerido' });
  }
  if (identifiers.length > 75) {
    return res.status(400).json({ error: 'máximo 75 identifiers por request' });
  }
  proxy(req, res, next, () => `${SCRYFALL_BASE}/cards/collection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers }),
  });
});

router.get('/cards/:id', (req, res, next) => {
  proxy(req, res, next, () => `${SCRYFALL_BASE}/cards/${encodeURIComponent(req.params.id)}`);
});

router.get('/cards/named', (req, res, next) => {
  proxy(req, res, next, () => {
    const params = new URLSearchParams();
    if (req.query.exact) params.set('exact', String(req.query.exact));
    if (req.query.fuzzy) params.set('fuzzy', String(req.query.fuzzy));
    if (req.query.set) params.set('set', String(req.query.set));
    return `${SCRYFALL_BASE}/cards/named?${params.toString()}`;
  });
});

router.get('/sets', (_req, res, next) => {
  proxy(_req, res, next, () => `${SCRYFALL_BASE}/sets`);
});

router.get('/sets/:code', (req, res, next) => {
  proxy(req, res, next, () => `${SCRYFALL_BASE}/sets/${encodeURIComponent(req.params.code)}`);
});

router.get('/symbology', (_req, res, next) => {
  proxy(_req, res, next, () => `${SCRYFALL_BASE}/symbology`);
});

router.get('/catalog/:name', (req, res, next) => {
  proxy(req, res, next, () => `${SCRYFALL_BASE}/catalog/${encodeURIComponent(req.params.name)}`);
});

export default router;
