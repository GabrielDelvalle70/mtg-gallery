import { memo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver.js';
import { rarityLabel } from '../utils/rarity.js';

function pickImage(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris ?? null;
}

function CardItem({ card }) {
  const ref = useRef(null);
  const inView = useIntersectionObserver(ref);
  const [loaded, setLoaded] = useState(false);
  const images = pickImage(card);

  return (
    <Link
      ref={ref}
      to={`/card/${card.id}`}
      state={{ card }}
      className="group block focus:outline-none"
      aria-label={`Ver detalle de ${card.name}`}
    >
      <article className="relative rounded-2xl overflow-hidden shadow-card transition-transform group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-mtg-blue">
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
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm font-semibold truncate">{card.name}</p>
          <p className="text-xs text-slate-200">
            {card.set_name} · {rarityLabel(card.rarity)}
          </p>
        </div>
      </article>
    </Link>
  );
}

export default memo(CardItem);
