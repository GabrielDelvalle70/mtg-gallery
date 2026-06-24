import { memo } from 'react';
import { parseManaCost, manaSymbolClass } from '../utils/mana.js';

function ManaCost({ cost = '' }) {
  const symbols = parseManaCost(cost);
  if (!symbols.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1" aria-label={`Coste de maná: ${cost}`}>
      {symbols.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm ${manaSymbolClass(
            s,
          )}`}
          title={s}
        >
          {s.length > 2 ? '⚡' : s}
        </span>
      ))}
    </span>
  );
}

export default memo(ManaCost);
