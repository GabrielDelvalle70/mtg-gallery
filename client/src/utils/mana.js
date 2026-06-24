const SYMBOL_RE = /\{([^}]+)\}/g;

const COLOR_MAP = {
  W: 'bg-mtg-white text-slate-900',
  U: 'bg-mtg-blue text-white',
  B: 'bg-mtg-black text-white',
  R: 'bg-mtg-red text-white',
  G: 'bg-mtg-green text-white',
  C: 'bg-mtg-colorless text-slate-900',
  X: 'bg-slate-400 text-white',
  T: 'bg-slate-200 text-slate-900',
};

export function parseManaCost(cost = '') {
  const matches = [];
  let m;
  SYMBOL_RE.lastIndex = 0;
  while ((m = SYMBOL_RE.exec(cost)) !== null) matches.push(m[1]);
  return matches;
}

export function manaSymbolClass(sym) {
  if (!sym) return 'bg-slate-200 text-slate-900';
  if (/^\d+$/.test(sym)) return 'bg-slate-300 text-slate-900';
  if (sym.length === 1 && COLOR_MAP[sym]) return COLOR_MAP[sym];
  if (sym.includes('/')) return 'bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900';
  return COLOR_MAP[sym] ?? 'bg-slate-300 text-slate-900';
}
