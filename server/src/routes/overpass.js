import { Router } from 'express';
import { cacheMiddleware } from '../middleware/cache.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const router = Router();
router.use(cacheMiddleware({ ttlMs: 24 * 60 * 60 * 1000 }));

function buildQuery(lat, lon, radius) {
  return `
    [out:json][timeout:25];
    (
      node["shop"="collector"](around:${radius},${lat},${lon});
      node["shop"="games"](around:${radius},${lat},${lon});
      way["shop"="collector"](around:${radius},${lat},${lon});
      way["shop"="games"](around:${radius},${lat},${lon});
    );
    out center body;
  `;
}

function normalize(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  const tags = el.tags || {};
  const addressParts = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean);
  return {
    id: `osm-${el.type}-${el.id}`,
    name: tags.name || 'Tienda sin nombre',
    address: addressParts.length ? addressParts.join(' ') : null,
    city: tags['addr:city'] || tags['addr:suburb'] || null,
    lat,
    lon,
    website: tags.website || tags['contact:website'] || null,
    osmTag: tags.shop,
    source: 'osm',
  };
}

router.get('/shops', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = Math.min(parseInt(req.query.radius, 10) || 50000, 200000);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat y lon son requeridos' });
    }
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'mtg-gallery/1.0 (+local-learning-project)',
      },
      body: `data=${encodeURIComponent(buildQuery(lat, lon, radius))}`,
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Overpass HTTP ${response.status}` });
    }
    const data = await response.json();
    const shops = (data.elements || []).map(normalize).filter(Boolean);
    res.json({ shops });
  } catch (err) {
    next(err);
  }
});

export default router;
