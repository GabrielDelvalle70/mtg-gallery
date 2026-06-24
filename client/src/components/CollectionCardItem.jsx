import { memo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.js';
import { useCollection } from '../context/CollectionContext.jsx';
import { rarityLabel } from '../utils/rarity.js';

function pickImage(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris ?? null;
}

function CollectionCardItem({ card }) {
  const ref = useRef(null);
  const inView = useIntersectionObserver(ref);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const { has, toggle } = useCollection();
  const images = pickImage(card);
  const owned = has(card.id);

  async function onToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await toggle(card);
    } catch (err) {
      console.error('[collection toggle]', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      ref={ref}
      className={`group relative rounded-2xl overflow-hidden shadow-card transition-all ${
        owned ? '' : 'opacity-70'
      }`}
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
            className={`w-full h-full object-cover transition-all duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${owned ? '' : 'grayscale'}`}
          />
        )}
      </div>

      <Link
        to={`/card/${card.id}`}
        state={{ card }}
        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-mtg-blue rounded-2xl"
        aria-label={`Ver detalle de ${card.name}`}
      />

      {owned && (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-mtg-green/95 text-white px-2 py-0.5 text-[10px] font-bold shadow-card">
          <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12l6.8-6.7a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
          En tu colección
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={`absolute top-2 right-2 z-20 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-card transition-colors disabled:opacity-50 ${
          owned
            ? 'bg-white text-mtg-red hover:bg-mtg-red hover:text-white'
            : 'bg-mtg-blue text-white hover:bg-blue-700'
        }`}
        aria-label={owned ? 'Quitar de mi colección' : 'Agregar a mi colección'}
      >
        {busy ? '…' : owned ? 'Quitar' : '+ Agregar'}
      </button>

      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-sm font-semibold truncate">{card.name}</p>
        <p className="text-xs text-slate-200">
          {card.collector_number ? `#${card.collector_number} · ` : ''}
          {rarityLabel(card.rarity)}
        </p>
      </div>
    </article>
  );
}

export default memo(CollectionCardItem);
