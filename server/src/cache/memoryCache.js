const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key) {
  store.delete(key);
}

export function cacheClear() {
  store.clear();
}

export function cacheStats() {
  return { size: store.size };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt < now) store.delete(k);
  }
}, 60_000).unref?.();
