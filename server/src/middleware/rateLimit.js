const buckets = new Map();

export function rateLimit({ windowMs = 1000, max = 120 } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.headers['x-forwarded-for'] || 'global';
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    next();
  };
}
