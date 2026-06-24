import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { wishlistApi } from '../services/wishlist.js';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [wishedIds, setWishedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setWishedIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    wishlistApi
      .list(token)
      .then((data) => {
        if (cancelled) return;
        setWishedIds(new Set(data.cards.map((c) => c.id)));
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  const has = useCallback((id) => wishedIds.has(id), [wishedIds]);

  const toggle = useCallback(
    async (card) => {
      if (!token) throw new Error('No autenticado');
      const id = card.id;
      const setCode = (card.set || card.set_code || '').toLowerCase();
      const wasWished = wishedIds.has(id);

      const next = new Set(wishedIds);
      if (wasWished) next.delete(id);
      else next.add(id);
      setWishedIds(next);

      try {
        if (wasWished) await wishlistApi.remove(token, id);
        else await wishlistApi.add(token, id, setCode);
      } catch (err) {
        setWishedIds(wishedIds); // rollback
        throw err;
      }
    },
    [token, wishedIds],
  );

  // Quita un id del estado local sin pegarle al server. Lo usa CollectionContext
  // cuando se adquiere una carta: el server ya la sacó de la wishlist en la misma
  // transacción (acquireCard), acá sólo sincronizamos la UI.
  const dropLocal = useCallback((id) => {
    setWishedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const totalWished = wishedIds.size;

  const value = useMemo(
    () => ({ has, toggle, dropLocal, totalWished, wishedIds, loading, error }),
    [has, toggle, dropLocal, totalWished, wishedIds, loading, error],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
