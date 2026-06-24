import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useWishlist } from './WishlistContext.jsx';
import { collectionApi } from '../services/collection.js';
import { nameKey } from '../utils/ownership.js';

const CollectionContext = createContext(null);

export function CollectionProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const { dropLocal: dropFromWishlist } = useWishlist();
  const [ownedIds, setOwnedIds] = useState(() => new Set());
  const [countsBySet, setCountsBySet] = useState({});
  const [ownedNames, setOwnedNames] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mapa cardId → clave de nombre, para recomputar ownedNames en updates optimistas
  // sin perder otras impresiones de la misma carta (varias card_id pueden compartir nombre).
  const namesById = useRef(new Map());

  const recomputeNames = useCallback(() => {
    const names = new Set();
    for (const key of namesById.current.values()) if (key) names.add(key);
    setOwnedNames(names);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setOwnedIds(new Set());
      setCountsBySet({});
      namesById.current = new Map();
      setOwnedNames(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    collectionApi
      .list(token)
      .then((data) => {
        if (cancelled) return;
        const ids = new Set();
        const bySet = {};
        const byId = new Map();
        for (const c of data.cards) {
          ids.add(c.id);
          bySet[c.setCode] = (bySet[c.setCode] || 0) + 1;
          byId.set(c.id, nameKey(c.name));
        }
        setOwnedIds(ids);
        setCountsBySet(bySet);
        namesById.current = byId;
        recomputeNames();
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
  }, [isAuthenticated, token, recomputeNames]);

  const has = useCallback((id) => ownedIds.has(id), [ownedIds]);

  const toggle = useCallback(
    async (card) => {
      if (!token) throw new Error('No autenticado');
      const id = card.id;
      const setCode = (card.set || card.set_code || '').toLowerCase();
      const wasOwned = ownedIds.has(id);

      const nextIds = new Set(ownedIds);
      const nextCounts = { ...countsBySet };
      if (wasOwned) {
        nextIds.delete(id);
        nextCounts[setCode] = Math.max(0, (nextCounts[setCode] || 0) - 1);
        namesById.current.delete(id);
      } else {
        nextIds.add(id);
        nextCounts[setCode] = (nextCounts[setCode] || 0) + 1;
        namesById.current.set(id, nameKey(card.name));
      }
      setOwnedIds(nextIds);
      setCountsBySet(nextCounts);
      recomputeNames();

      try {
        if (wasOwned) {
          await collectionApi.remove(token, id);
        } else {
          await collectionApi.add(token, id, setCode, card.name);
          // El server ya sacó la carta de la wishlist (acquireCard); sincronizamos la UI.
          dropFromWishlist(id);
        }
      } catch (err) {
        // rollback completo (ids, counts y nombre)
        setOwnedIds(ownedIds);
        setCountsBySet(countsBySet);
        if (wasOwned) namesById.current.set(id, nameKey(card.name));
        else namesById.current.delete(id);
        recomputeNames();
        throw err;
      }
    },
    [token, ownedIds, countsBySet, dropFromWishlist, recomputeNames],
  );

  const totalOwned = ownedIds.size;

  // ¿Poseés alguna impresión de una carta con este nombre?
  const ownsName = useCallback((name) => ownedNames.has(nameKey(name)), [ownedNames]);

  const value = useMemo(
    () => ({ has, toggle, totalOwned, countsBySet, ownedIds, ownedNames, ownsName, loading, error }),
    [has, toggle, totalOwned, countsBySet, ownedIds, ownedNames, ownsName, loading, error],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider');
  return ctx;
}
