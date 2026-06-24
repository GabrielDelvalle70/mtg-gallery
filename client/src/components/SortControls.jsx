import { memo } from 'react';
import { useFilters } from '../context/FiltersContext.jsx';
import { ORDER_OPTIONS } from '../utils/rarity.js';

function SortControls() {
  const { state, set } = useFilters();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-slate-500">Ordenar por</label>
      <select className="input max-w-xs" value={state.order} onChange={(e) => set('order', e.target.value)}>
        {ORDER_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn"
        onClick={() => set('dir', state.dir === 'asc' ? 'desc' : 'asc')}
        title="Invertir dirección"
      >
        {state.dir === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
      </button>
    </div>
  );
}

export default memo(SortControls);
