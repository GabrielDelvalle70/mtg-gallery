import { memo, useMemo } from 'react';
import { useFilters } from '../context/FiltersContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { setsUrl } from '../services/scryfall.js';
import { RARITY, TYPE_OPTIONS, LEGALITY_OPTIONS } from '../utils/rarity.js';
import { COLORS } from '../utils/colors.js';

function Filters() {
  const { state, set, toggleColor, reset } = useFilters();
  const { data: setsData } = useFetch(setsUrl(), { ttlMs: 60 * 60 * 1000 });

  const sets = useMemo(() => {
    const list = setsData?.data ?? [];
    return [...list]
      .filter((s) => !s.digital_only)
      .sort((a, b) => (b.released_at ?? '').localeCompare(a.released_at ?? ''));
  }, [setsData]);

  const years = useMemo(() => {
    const ys = new Set();
    sets.forEach((s) => s.released_at && ys.add(s.released_at.slice(0, 4)));
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, [sets]);

  return (
    <aside className="space-y-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filtros</h3>
        <button className="text-xs text-mtg-blue hover:underline" onClick={reset}>
          Limpiar
        </button>
      </div>

      <fieldset>
        <legend className="text-xs uppercase tracking-wide text-slate-500 mb-1">Colores</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const active = state.colors.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColor(c.id)}
                className={`w-8 h-8 rounded-full border-2 transition ${
                  active ? 'border-mtg-mythic scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
                aria-pressed={active}
                aria-label={c.label}
              />
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Rareza</span>
        <select
          className="input mt-1"
          value={state.rarity}
          onChange={(e) => set('rarity', e.target.value)}
        >
          <option value="">Cualquiera</option>
          {RARITY.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Set / Expansión</span>
        <select
          className="input mt-1"
          value={state.set}
          onChange={(e) => set('set', e.target.value)}
        >
          <option value="">Todos los sets</option>
          {sets.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code.toUpperCase()})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Año</span>
        <select
          className="input mt-1"
          value={state.year}
          onChange={(e) => set('year', e.target.value)}
        >
          <option value="">Todos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Tipo</span>
        <select
          className="input mt-1"
          value={state.type}
          onChange={(e) => set('type', e.target.value)}
        >
          <option value="">Cualquier tipo</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t.toLowerCase()}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Legalidad</span>
        <select
          className="input mt-1"
          value={state.legality}
          onChange={(e) => set('legality', e.target.value)}
        >
          <option value="">Cualquiera</option>
          {LEGALITY_OPTIONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}

export default memo(Filters);
