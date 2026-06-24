import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

const CacheContext = createContext(null);
const STORAGE_PREFIX = 'mtg-gallery:cache:';
const DEFAULT_TTL = 5 * 60 * 1000;

function readPersisted(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

function writePersisted(key, value, ttlMs) {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ value, expiresAt: Date.now() + ttlMs }),
    );
  } catch {
    // quota exceeded or disabled storage; ignore
  }
}

export function CacheProvider({ children }) {
  const memoryRef = useRef(new Map());

  const get = useCallback((key) => {
    const mem = memoryRef.current.get(key);
    if (mem && mem.expiresAt > Date.now()) return mem.value;
    if (mem) memoryRef.current.delete(key);
    const persisted = readPersisted(key);
    if (persisted) {
      memoryRef.current.set(key, { value: persisted, expiresAt: Date.now() + DEFAULT_TTL });
    }
    return persisted;
  }, []);

  const set = useCallback((key, value, ttlMs = DEFAULT_TTL) => {
    memoryRef.current.set(key, { value, expiresAt: Date.now() + ttlMs });
    writePersisted(key, value, ttlMs);
  }, []);

  const clear = useCallback(() => {
    memoryRef.current.clear();
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }, []);

  const api = useMemo(() => ({ get, set, clear }), [get, set, clear]);

  return <CacheContext.Provider value={api}>{children}</CacheContext.Provider>;
}

export function useCache() {
  const ctx = useContext(CacheContext);
  if (!ctx) throw new Error('useCache must be used within CacheProvider');
  return ctx;
}
