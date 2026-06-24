import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { useCollection } from '../context/CollectionContext.jsx';
import { setsUrl } from '../services/scryfall.js';
import Loader from '../components/Loader.jsx';
import CollectionExportModal from '../components/CollectionExportModal.jsx';

const RELEVANT_SET_TYPES = new Set([
  'core',
  'expansion',
  'masters',
  'commander',
  'draft_innovation',
  'starter',
  'planechase',
  'archenemy',
  'duel_deck',
  'from_the_vault',
]);

function yearOf(set) {
  return set.released_at ? Number(set.released_at.slice(0, 4)) : 0;
}

export default function CollectionPage() {
  const { data, error, loading } = useFetch(setsUrl(), { ttlMs: 24 * 60 * 60 * 1000 });
  const { countsBySet, totalOwned, ownedIds } = useCollection();
  const [search, setSearch] = useState('');
  const [ownership, setOwnership] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);

  const grouped = useMemo(() => {
    if (!data?.data) return [];
    const filtered = data.data.filter((s) => {
      if (s.digital) return false;
      if (!RELEVANT_SET_TYPES.has(s.set_type)) return false;
      if (!s.card_count) return false;
      const owned = countsBySet[s.code.toLowerCase()] || 0;
      if (ownership === 'with-cards' && owned <= 0) return false;
      if (ownership === 'complete' && (owned < s.card_count || s.card_count <= 0)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const byYear = new Map();
    for (const s of filtered) {
      const y = yearOf(s) || 'Sin fecha';
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(s);
    }
    return [...byYear.entries()].sort((a, b) => (b[0] || 0) - (a[0] || 0));
  }, [data, search, ownership, countsBySet]);

  const totalSetsShown = grouped.reduce((acc, [, sets]) => acc + sets.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Mi Colección</h1>
          <p className="text-sm text-slate-500">
            {totalOwned > 0
              ? `Llevás ${totalOwned} ${totalOwned === 1 ? 'carta' : 'cartas'} en tu colección.`
              : 'Aún no agregaste cartas. Elegí un set para empezar.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            className="input sm:w-72"
            placeholder="Buscar set por nombre o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn shrink-0"
            disabled={totalOwned === 0}
            onClick={() => setExportOpen(true)}
            title={totalOwned === 0 ? 'Agregá cartas para exportar' : 'Exportar tu colección a CSV o JSON'}
          >
            Exportar
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: 'Todos los sets' },
          { id: 'with-cards', label: 'Con cartas en mi colección' },
          { id: 'complete', label: 'Completos' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setOwnership(f.id)}
            className={`btn ${ownership === f.id ? 'btn-primary' : ''}`}
          >
            {f.label}
          </button>
        ))}
        {!loading && data && (
          <span className="text-sm text-slate-500 ml-auto">
            {totalSetsShown} {totalSetsShown === 1 ? 'set' : 'sets'}
          </span>
        )}
      </div>

      {loading && !data && <Loader label="Cargando sets…" />}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          Error cargando sets: {error.message}
        </div>
      )}

      {grouped.length === 0 && !loading && (
        <p className="text-center py-12 text-slate-500">
          {ownership === 'with-cards' && totalOwned === 0
            ? 'Aún no tenés cartas en ningún set. Probá con "Todos los sets" y elegí uno para empezar.'
            : ownership === 'complete'
              ? 'Todavía no completaste ningún set.'
              : 'Sin sets que coincidan.'}
        </p>
      )}

      <div className="space-y-8">
        {grouped.map(([year, sets]) => (
          <section key={year}>
            <h2 className="font-display text-xl mb-3 sticky top-14 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur py-2 -mx-2 px-2 z-10">
              {year}{' '}
              <span className="text-sm text-slate-500 font-sans">
                · {sets.length} {sets.length === 1 ? 'set' : 'sets'}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sets.map((s) => {
                const owned = countsBySet[s.code.toLowerCase()] || 0;
                const pct = s.card_count ? Math.round((owned / s.card_count) * 100) : 0;
                const complete = owned >= s.card_count && s.card_count > 0;
                return (
                  <Link
                    key={s.id}
                    to={`/collection/${s.code}`}
                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-mtg-blue transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {s.icon_svg_uri && (
                        <img
                          src={s.icon_svg_uri}
                          alt=""
                          className="w-8 h-8 dark:invert"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{s.name}</p>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          {s.code} · {s.card_count} cartas
                        </p>
                      </div>
                      {complete && (
                        <span className="chip bg-mtg-green/15 text-mtg-green">100%</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">
                          {owned} / {s.card_count}
                        </span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${complete ? 'bg-mtg-green' : 'bg-mtg-blue'} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {exportOpen && (
        <CollectionExportModal ownedIds={ownedIds} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}
