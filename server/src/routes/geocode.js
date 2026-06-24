import { Router } from 'express';
import { cacheMiddleware } from '../middleware/cache.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

const router = Router();
router.use(cacheMiddleware({ ttlMs: 24 * 60 * 60 * 1000 }));

router.get('/reverse', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat y lon son requeridos' });
    }
    const url = `${NOMINATIM}?lat=${lat}&lon=${lon}&format=json&zoom=3&accept-language=es`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'mtg-gallery/1.0 (+local-learning-project)',
      },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Nominatim HTTP ${response.status}` });
    }
    const data = await response.json();
    const code = data?.address?.country_code?.toUpperCase() || null;
    const name = data?.address?.country || null;
    res.json({ countryCode: code, countryName: name });
  } catch (err) {
    next(err);
  }
});

export default router;
