import { memo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import { rarityLabel } from '../utils/rarity.js';

function pickImage(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris ?? null;
}

function yearOf(card) {
  return card.released_at ? card.released_at.slice(0, 4) : null;
}

function WishlistCardItem({ card }) {
  const ref = useRef(null);
  const inView = useIntersectionObserver(ref);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toggle } = useWishlist();
  const images = pickImage(card);
  const year = yearOf(card);

  async function onRemove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await toggle(card); // está en la wishlist → toggle la quita
    } catch (err) {
      console.error('[wishlist toggle]', err);
      setBusy(false);
    }
  }

  return (
    // Mismo patrón stretched-link que CollectionCardItem: Link overlay + botón z-20.
    <article
      ref={ref}
      className="group relative rounded-2xl overflow-hidden shadow-card transition-transform hover:-translate-y-1"
    >
      <div className="aspect-[5/7] bg-slate-200 dark:bg-slate-800">
        {!loaded && <div className="skeleton absolute inset-0" />}
        {inView && images?.normal && (
          <img
            src={images.normal}
            srcSet={`${images.small} 200w, ${images.normal} 488w, ${images.large} 672w`}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
            alt={card.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>

      <Link
        to={`/card/${card.id}`}
        state={{ card }}
        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-mtg-blue rounded-2xl"
        aria-label={`Ver detalle de ${card.name}`}
      />

      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="absolute top-2 right-2 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full bg-mtg-red text-white shadow-card transition-colors hover:bg-red-700 disabled:opacity-50"
        aria-label="Quitar de mi wishlist"
        title="Quitar de mi wishlist"
      >
        {busy ? (
          '…'
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        )}
      </button>

      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-sm font-semibold truncate">{card.name}</p>
        <p className="text-xs text-slate-200 truncate">
          {card.set_name}
          {year ? ` · ${year}` : ''} · {rarityLabel(card.rarity)}
        </p>
      </div>
    </article>
  );
}

export default memo(WishlistCardItem);
