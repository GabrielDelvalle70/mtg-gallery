import { useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import Filters from '../components/Filters.jsx';
import SortControls from '../components/SortControls.jsx';
import CardGrid from '../components/CardGrid.jsx';
import Pagination from '../components/Pagination.jsx';
import GridSkeleton from '../components/GridSkeleton.jsx';
import { useFilters } from '../context/FiltersContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { buildScryfallQuery, searchUrl, SCRYFALL_PAGE_SIZE } from '../services/scryfall.js';
import { usePagination } from '../hooks/usePagination.js';
import { rarityRank } from '../utils/rarity.js';

const PAGE_SIZE_DISPLAY = 36;

export default function HomePage() {
  const { state, set } = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const scryfallPage = Math.floor(((state.page - 1) * PAGE_SIZE_DISPLAY) / SCRYFALL_PAGE_SIZE) + 1;

  const q = useMemo(() => buildScryfallQuery(state), [state]);
  const url = useMemo(
    () => searchUrl({ q, order: state.order, dir: state.dir, page: scryfallPage }),
    [q, state.order, state.dir, scryfallPage],
  );

  const { data, error, loading, refetch } = useFetch(url, { deps: [url] });

  const cards = useMemo(() => {
    let list = data?.data ?? [];
    if (state.order === 'rarity') {
      list = [...list].sort(
        (a, b) =>
          (state.dir === 'desc' ? -1 : 1) * (rarityRank(a.rarity) - rarityRank(b.rarity)),
      );
    }
    const offset = ((state.page - 1) * PAGE_SIZE_DISPLAY) % SCRYFALL_PAGE_SIZE;
    return list.slice(offset, offset + PAGE_SIZE_DISPLAY);
  }, [data, state.page, state.order, state.dir]);

  const total = data?.total_cards ?? 0;
  const pagination = usePagination({ total, page: state.page, pageSize: PAGE_SIZE_DISPLAY });
  const is404 = error?.status === 404;

  return (
    <div className="grid lg:grid-cols-[280px,1fr] gap-6">
      <div className={`${filtersOpen ? 'block' : 'hidden lg:block'}`}>
        <Filters />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1">
            <SearchBar />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn lg:hidden" onClick={() => setFiltersOpen((v) => !v)}>
              {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
            </button>
            <SortControls />
          </div>
        </div>

        {error && !is404 && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error.message}{' '}
            <button className="underline ml-2" onClick={refetch}>
              Reintentar
            </button>
          </div>
        )}

        {loading && !data && <GridSkeleton />}

        {!loading && (is404 || total === 0) && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg">Sin resultados para esta búsqueda.</p>
            <p className="text-sm">Prueba con otros filtros o términos.</p>
          </div>
        )}

        {data && total > 0 && (
          <>
            <p className="text-sm text-slate-500">
              {total.toLocaleString()} cartas encontradas
            </p>
            <CardGrid cards={cards} />
            <Pagination
              page={state.page}
              totalPages={pagination.totalPages}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onChange={(p) => {
                set('page', p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </section>

    </div>
  );
}
