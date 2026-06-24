import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CollectionCardItem from '../components/CollectionCardItem.jsx';
import GridSkeleton from '../components/GridSkeleton.jsx';
import Loader from '../components/Loader.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useCollection } from '../context/CollectionContext.jsx';
import { searchUrl } from '../services/scryfall.js';

const SET_INFO_URL = (code) => `/api/scryfall/sets/${encodeURIComponent(code.toLowerCase())}`;

export default function CollectionSetPage() {
  const { setCode } = useParams();
  const codeLower = setCode.toLowerCase();
  const { data: setData, error: setError } = useFetch(SET_INFO_URL(codeLower), {
    ttlMs: 24 * 60 * 60 * 1000,
  });

  const [cards, setCards] = useState([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [pagesError, setPagesError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    setCards([]);
    setLoadingPages(true);
    setPagesError(null);

    async function loadAll() {
      try {
        const accum = [];
        for (let page = 1; page < 50; page++) {
          const url = searchUrl({
            q: `e:${codeLower}`,
            order: 'set',
            dir: 'asc',
            page,
            unique: 'prints',
          });
          const res = await fetch(url, { signal: ctrl.signal });
          if (res.status === 404) break;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          accum.push(...(json.data ?? []));
          if (cancelled) return;
          setCards([...accum]);
          if (!json.has_more) break;
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !cancelled) setPagesError(err);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [codeLower]);

  const { has, countsBySet } = useCollection();
  const owned = countsBySet[codeLower] || 0;
  const total = setData?.card_count ?? cards.length;
  const pct = total ? Math.round((owned / total) * 100) : 0;

  const visible = useMemo(() => {
    if (filter === 'owned') return cards.filter((c) => has(c.id));
    if (filter === 'missing') return cards.filter((c) => !has(c.id));
    return cards;
  }, [cards, filter, has]);

  if (setError?.status === 404) {
    return (
      <div className="text-center py-16">
        <h2 className="font-display text-2xl mb-3">Set no encontrado</h2>
        <Link to="/collection" className="btn btn-primary">
          Volver a Mi Colección
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/collection" className="text-sm text-slate-500 hover:text-mtg-blue inline-flex items-center gap-1">
        ← Volver a Mi Colección
      </Link>

      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start gap-4">
          {setData?.icon_svg_uri && (
            <img
              src={setData.icon_svg_uri}
              alt=""
              className="w-12 h-12 dark:invert flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl truncate">{setData?.name || setCode}</h1>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {codeLower} · {setData?.released_at?.slice(0, 4)} · {total} cartas
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-semibold text-mtg-blue">{pct}%</p>
            <p className="text-xs text-slate-500">
              {owned} / {total}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${pct === 100 ? 'bg-mtg-green' : 'bg-mtg-blue'} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'owned', label: 'En mi colección' },
          { id: 'missing', label: 'Faltantes' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`btn ${filter === f.id ? 'btn-primary' : ''}`}
          >
            {f.label}
          </button>
        ))}
        {loadingPages && (
          <span className="text-sm text-slate-500 ml-2">
            Cargando cartas… {cards.length > 0 && `(${cards.length})`}
          </span>
        )}
      </div>

      {pagesError && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          Error cargando cartas: {pagesError.message}
        </div>
      )}

      {cards.length === 0 && loadingPages && <GridSkeleton />}

      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {visible.map((card) => (
            <CollectionCardItem key={card.id} card={card} />
          ))}
        </div>
      )}

      {!loadingPages && visible.length === 0 && cards.length > 0 && (
        <p className="text-center py-12 text-slate-500">
          {filter === 'owned' ? 'Aún no tenés cartas de este set.' : 'Ya completaste el set 🎉'}
        </p>
      )}
    </div>
  );
}
