import { useCallback, useEffect, useRef, useState } from 'react';
import { useCache } from '../context/CacheContext.jsx';

export function useFetch(url, { skip = false, ttlMs = 5 * 60 * 1000, deps = [] } = {}) {
  const cache = useCache();
  const [data, setData] = useState(() => (url ? cache.get(url) : null));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const run = useCallback(
    async (signal) => {
      if (!url || skip) return;
      const cached = cache.get(url);
      if (cached) {
        setData(cached);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithRetry(url, { signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw Object.assign(new Error(body?.details || body?.error || `HTTP ${res.status}`), {
            status: res.status,
            body,
          });
        }
        const json = await res.json();
        cache.set(url, json, ttlMs);
        setData(json);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, skip, ttlMs, ...deps],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    run(ctrl.signal);
    return () => ctrl.abort();
  }, [run]);

  const refetch = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    return run(ctrl.signal);
  }, [run]);

  return { data, error, loading, refetch };
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (err.name === 'AbortError') throw err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr || new Error('Network error');
}
