import { cacheGet, cacheSet } from '../cache/memoryCache.js';

export function cacheMiddleware({ ttlMs = 5 * 60 * 1000 } = {}) {
  return function cacheLayer(req, res, next) {
    if (req.method !== 'GET') return next();
    const key = `${req.method}:${req.originalUrl}`;
    const hit = cacheGet(key);
    if (hit) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      return res.status(hit.status).json(hit.body);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, { status: res.statusCode, body }, ttlMs);
      }
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      return originalJson(body);
    };
    next();
  };
}
