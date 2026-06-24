import { memo, useEffect } from 'react';
import { formatPrice, formatDate } from '../utils/format.js';
import { rarityLabel } from '../utils/rarity.js';
import ManaCost from './ManaCost.jsx';

function pickImage(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris ?? null;
}

function CardModal({ card, onClose }) {
  useEffect(() => {
    if (!card) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [card, onClose]);

  if (!card) return null;
  const img = pickImage(card);
  const prices = card.prices ?? {};

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-card grid md:grid-cols-2 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
          {img?.large && <img src={img.large} alt={card.name} className="rounded-xl max-h-[80vh]" />}
        </div>
        <div className="p-5 overflow-y-auto scrollbar-thin">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">{card.name}</h2>
              <p className="text-xs text-slate-500">
                {card.set_name} · {rarityLabel(card.rarity)} · {formatDate(card.released_at)}
              </p>
            </div>
            <button className="btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </header>

          {card.mana_cost && (
            <div className="mb-3">
              <ManaCost cost={card.mana_cost} />
            </div>
          )}

          <p className="text-sm font-medium mb-3">{card.type_line}</p>

          {card.oracle_text && (
            <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300 mb-3">
              {card.oracle_text}
            </p>
          )}

          {card.flavor_text && (
            <p className="text-sm italic text-slate-500 mb-3">"{card.flavor_text}"</p>
          )}

          {(card.power || card.toughness) && (
            <p className="text-sm mb-3">
              <strong>P/T:</strong> {card.power}/{card.toughness}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-2 text-xs my-3">
            <div>
              <dt className="text-slate-500">USD</dt>
              <dd>{formatPrice(prices.usd)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">USD Foil</dt>
              <dd>{formatPrice(prices.usd_foil)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">EUR</dt>
              <dd>{formatPrice(prices.eur, 'EUR')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Artista</dt>
              <dd>{card.artist ?? '—'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 mt-4">
            {card.scryfall_uri && (
              <a className="btn btn-primary" href={card.scryfall_uri} target="_blank" rel="noreferrer">
                Ver en Scryfall ↗
              </a>
            )}
            {card.related_uris?.gatherer && (
              <a className="btn" href={card.related_uris.gatherer} target="_blank" rel="noreferrer">
                Gatherer ↗
              </a>
            )}
            {card.related_uris?.edhrec && (
              <a className="btn" href={card.related_uris.edhrec} target="_blank" rel="noreferrer">
                EDHREC ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CardModal);
