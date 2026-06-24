import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { fetchCardsByIds } from '../services/scryfall.js';
import { pluralize } from '../utils/format.js';
import { rarityLabel } from '../utils/rarity.js';
import WishlistCardItem from '../components/WishlistCardItem.jsx';
import Loader from '../components/Loader.jsx';

function pickImage(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris ?? null;
}

// ── Fila de la vista lista (cada carta diferenciada por set y año) ────────────
const WishlistRow = memo(function WishlistRow({ card }) {
  const { toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const images = pickImage(card);
  const year = card.released_at ? card.released_at.slice(0, 4) : null;

  async function onRemove() {
    if (busy) return;
    setBusy(true);
    try {
      await toggle(card);
    } catch (err) {
      console.error('[wishlist toggle]', err);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <Link to={`/card/${card.id}`} state={{ card }} className="flex items-center gap-3 flex-1 min-w-0">
        {images?.small && (
          <img src={images.small} alt="" className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0" loading="lazy" />
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{card.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {card.set_name} ({card.set?.toUpperCase()})
            {year ? ` · ${year}` : ''} · {rarityLabel(card.rarity)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="flex-shrink-0 btn border border-mtg-red text-mtg-red hover:bg-mtg-red hover:text-white disabled:opacity-50"
        aria-label={`Quitar ${card.name} de mi wishlist`}
      >
        {busy ? '…' : 'Quitar'}
      </button>
    </div>
  );
});

// ── Página ────────────────────────────────────────────────────────────────────
export default function WishlistPage() {
  const { wishedIds, totalWished, loading: listLoading } = useWishlist();
  const [view, setView] = useLocalStorage('mtg-gallery:wishlist-view', 'grid');

  // Cache local id → carta completa (para saber qué IDs faltan y no re-fetchear todo
  // al quitar una carta). Las cartas mostradas viven en STATE, no en un memo sobre el
  // ref: derivar de un ref + forceRender es frágil (el memo no recomputa si sus deps no
  // cambian, y en dev/StrictMode el fetch abortado deja `fetching` en false antes de que
  // lleguen los datos → quedaba vacío). State es el patrón confiable (igual que StatsPage).
  const cacheRef = useRef(new Map());
  const [cards, setCards] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);

  const idsKey = useMemo(() => [...wishedIds].sort().join(','), [wishedIds]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    // Render inmediato desde el cache (cubre el quitar: sin re-fetch, baja al instante).
    const fromCache = () => ids.map((id) => cacheRef.current.get(id)).filter(Boolean);
    setCards(fromCache());

    const missing = ids.filter((id) => !cacheRef.current.has(id));
    if (missing.length === 0) return;

    const controller = new AbortController();
    setFetching(true);
    setError(null);
    setProgress({ done: 0, total: missing.length });
    fetchCardsByIds(missing, {
      signal: controller.signal,
      onProgress: (done, total) => setProgress({ done, total }),
    })
      .then(({ cards: fetched }) => {
        for (const c of fetched) cacheRef.current.set(c.id, c);
        setCards(fromCache());
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setFetching(false));
    return () => controller.abort();
  }, [idsKey]);

  if (totalWished === 0 && !listLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="font-display text-3xl">Mi Wishlist</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-slate-500 mb-4">
            Tu wishlist está vacía. Abrí el detalle de cualquier carta y tocá “Agregar a lista de
            deseados”.
          </p>
          <Link to="/" className="btn btn-primary">
            Ir a la galería
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Mi Wishlist</h1>
          <p className="text-sm text-slate-500">
            {totalWished} {pluralize(totalWished, 'carta')} que querés conseguir. Al agregarlas a tu
            colección salen de acá automáticamente.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 self-start">
          {[
            { id: 'grid', label: 'Grilla' },
            { id: 'list', label: 'Lista' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setView(opt.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === opt.id
                  ? 'bg-mtg-blue text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-pressed={view === opt.id}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          Error cargando las cartas: {error.message}
        </div>
      )}

      {(listLoading || (fetching && cards.length === 0)) && (
        <Loader
          label={
            progress.total
              ? `Cargando cartas… ${progress.done}/${progress.total}`
              : 'Cargando wishlist…'
          }
        />
      )}

      {cards.length > 0 &&
        (view === 'grid' ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-fade-in">
            {cards.map((card) => (
              <WishlistCardItem key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
            {cards.map((card) => (
              <WishlistRow key={card.id} card={card} />
            ))}
          </div>
        ))}
    </div>
  );
}
