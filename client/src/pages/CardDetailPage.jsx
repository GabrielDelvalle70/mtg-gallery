import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { cardByIdUrl } from '../services/scryfall.js';
import { formatDate, formatPrice } from '../utils/format.js';
import { rarityLabel } from '../utils/rarity.js';
import ManaCost from '../components/ManaCost.jsx';
import Loader from '../components/Loader.jsx';

function pickImage(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris ?? null;
}

export default function CardDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const preset = location.state?.card;

  const { isAuthenticated } = useAuth();
  const { has, toggle } = useWishlist();
  const [wishBusy, setWishBusy] = useState(false);

  const { data, loading, error } = useFetch(cardByIdUrl(id), { skip: !!preset });
  const card = preset ?? data;
  const img = useMemo(() => (card ? pickImage(card) : null), [card]);

  const wished = card ? has(card.id) : false;

  async function onWish() {
    if (wishBusy || !card) return;
    setWishBusy(true);
    try {
      await toggle(card);
    } catch (err) {
      console.error('[wishlist toggle]', err);
    } finally {
      setWishBusy(false);
    }
  }

  if (loading && !card) return <Loader label="Cargando carta…" />;
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-3">No se pudo cargar la carta: {error.message}</p>
        <Link to="/" className="btn btn-primary">
          Volver
        </Link>
      </div>
    );
  }
  if (!card) return null;

  const prices = card.prices ?? {};
  const legalities = Object.entries(card.legalities ?? {})
    .filter(([, status]) => status === 'legal')
    .map(([fmt]) => fmt);

  return (
    <article className="grid md:grid-cols-[minmax(0,1fr),1fr] gap-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn w-fit md:col-span-2">
        ← Volver
      </button>

      <div className="flex items-start justify-center">
        {img?.large && (
          <img
            src={img.large}
            alt={card.name}
            className="rounded-2xl shadow-card max-h-[80vh]"
            loading="eager"
          />
        )}
      </div>

      <div className="space-y-4">
        <header>
          <h1 className="font-display text-3xl mb-1">{card.name}</h1>
          <p className="text-sm text-slate-500">
            {card.set_name} ({card.set?.toUpperCase()}) · {rarityLabel(card.rarity)} ·{' '}
            {formatDate(card.released_at)}
          </p>
        </header>

        {isAuthenticated && (
          <button
            type="button"
            onClick={onWish}
            disabled={wishBusy}
            className={`btn w-full sm:w-fit ${wished ? '' : 'btn-primary'} ${
              wished ? 'border border-mtg-red text-mtg-red hover:bg-mtg-red hover:text-white' : ''
            }`}
            aria-pressed={wished}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={wished ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
            {wishBusy
              ? 'Guardando…'
              : wished
                ? 'Quitar de lista de deseados'
                : 'Agregar a lista de deseados'}
          </button>
        )}

        {card.mana_cost && <ManaCost cost={card.mana_cost} />}

        <p className="font-medium">{card.type_line}</p>

        {card.oracle_text && (
          <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{card.oracle_text}</p>
        )}

        {card.flavor_text && (
          <p className="italic text-slate-500 border-l-4 border-slate-300 pl-3">"{card.flavor_text}"</p>
        )}

        {(card.power || card.toughness) && (
          <p>
            <strong>P/T:</strong> {card.power}/{card.toughness}
          </p>
        )}

        <section>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Precios</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Price label="USD" value={formatPrice(prices.usd)} />
            <Price label="USD Foil" value={formatPrice(prices.usd_foil)} />
            <Price label="EUR" value={formatPrice(prices.eur, 'EUR')} />
            <Price label="Tix" value={prices.tix ?? '—'} />
          </div>
        </section>

        {legalities.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Legalidades</h2>
            <div className="flex flex-wrap gap-1.5">
              {legalities.map((l) => (
                <span key={l} className="chip">
                  {l}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="text-sm text-slate-500">
          <p>
            <strong>Artista:</strong> {card.artist ?? '—'}
          </p>
          {card.collector_number && (
            <p>
              <strong>Nº de coleccionista:</strong> {card.collector_number}
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
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
    </article>
  );
}

function Price({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
