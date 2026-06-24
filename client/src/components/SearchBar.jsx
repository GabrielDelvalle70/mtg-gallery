import { memo, useEffect, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce.js';
import { useFilters } from '../context/FiltersContext.jsx';

function SearchBar() {
  const { state, set } = useFilters();
  const [value, setValue] = useState(state.query);
  const debounced = useDebounce(value, 300);

  useEffect(() => {
    if (debounced !== state.query) set('query', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Busca cartas (p. ej. "Lightning Bolt", "dragon", "elf")'
        className="input pl-10"
        aria-label="Buscar cartas por nombre"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
        🔍
      </span>
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default memo(SearchBar);
