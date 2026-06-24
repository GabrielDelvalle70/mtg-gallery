import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { useCollection } from '../context/CollectionContext.jsx';
import { setsUrl, fetchCardsByIds } from '../services/scryfall.js';
import { COLORS } from '../utils/colors.js';
import { RARITY } from '../utils/rarity.js';
import { formatPrice, pluralize } from '../utils/format.js';
import Loader from '../components/Loader.jsx';

// ── Helpers de agregación ────────────────────────────────────────────────────

const CMC_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

// Tipo primario en orden de prioridad (una carta cae en el primero que matchee).
const TYPE_ORDER = [
  ['Creature', 'Criaturas'],
  ['Planeswalker', 'Planeswalkers'],
  ['Instant', 'Instantáneos'],
  ['Sorcery', 'Conjuros'],
  ['Enchantment', 'Encantamientos'],
  ['Artifact', 'Artefactos'],
  ['Battle', 'Batallas'],
  ['Land', 'Tierras'],
];

function primaryTypeLine(card) {
  return (card.type_line || card.card_faces?.[0]?.type_line || '').split('//')[0];
}

function aggregate(cards) {
  const curve = CMC_BUCKETS.map((b) => ({ label: b, value: 0 }));
  const rarity = RARITY.map((r) => ({ id: r.id, label: r.label, value: 0 }));
  const colorBuckets = [
    ...COLORS.map((c) => ({ id: c.id, label: c.label, hex: c.hex, value: 0 })),
    { id: 'M', label: 'Multicolor', hex: '#F8991C', value: 0 },
    { id: 'C', label: 'Incoloro', hex: '#CAC5C0', value: 0 },
  ];
  const typeMap = new Map(TYPE_ORDER.map(([, label]) => [label, 0]));
  typeMap.set('Otros', 0);

  let usd = 0;

  for (const card of cards) {
    const tl = primaryTypeLine(card);
    const isLand = /\bLand\b/.test(tl);

    // Curva de maná: excluye tierras (no tienen costo de maná relevante).
    if (!isLand && typeof card.cmc === 'number') {
      const idx = Math.min(7, Math.floor(card.cmc));
      curve[idx].value += 1;
    }

    // Rareza
    const r = rarity.find((x) => x.id === card.rarity);
    if (r) r.value += 1;

    // Color (buckets exclusivos según colores de casteo)
    const colors = card.colors || card.card_faces?.[0]?.colors || [];
    if (colors.length === 0) {
      colorBuckets.find((c) => c.id === 'C').value += 1;
    } else if (colors.length >= 2) {
      colorBuckets.find((c) => c.id === 'M').value += 1;
    } else {
      const c = colorBuckets.find((x) => x.id === colors[0]);
      if (c) c.value += 1;
    }

    // Tipo primario
    const match = TYPE_ORDER.find(([key]) => new RegExp(`\\b${key}\\b`).test(tl));
    typeMap.set(match ? match[1] : 'Otros', (typeMap.get(match ? match[1] : 'Otros') || 0) + 1);

    // Valor estimado
    const price = parseFloat(card.prices?.usd ?? card.prices?.usd_foil ?? '');
    if (!Number.isNaN(price)) usd += price;
  }

  const types = [...typeMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((t) => t.value > 0);

  return { curve, rarity, colors: colorBuckets, types, usd };
}

// ── Sub-componentes presentacionales ─────────────────────────────────────────

const StatTile = memo(function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-2xl font-display">{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
});

const BarChart = memo(function BarChart({ title, items, accent = 'bg-mtg-blue' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((acc, i) => acc + i.value, 0);
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h2 className="font-display text-lg mb-3">{title}</h2>
      {total === 0 ? (
        <p className="text-sm text-slate-500">Sin datos.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate text-slate-600 dark:text-slate-300">
                {i.label}
              </span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${i.hex ? '' : accent}`}
                  style={{
                    width: `${(i.value / max) * 100}%`,
                    ...(i.hex ? { backgroundColor: i.hex } : {}),
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums font-medium">{i.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

// ── Página ────────────────────────────────────────────────────────────────────

export default function CollectionStatsPage() {
  const { ownedIds, countsBySet, totalOwned } = useCollection();
  const { data: setsData } = useFetch(setsUrl(), { ttlMs: 24 * 60 * 60 * 1000 });

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);

  // IDs como string estable para el dep del effect (no re-fetchea si no cambian).
  const idsKey = useMemo(() => [...ownedIds].sort().join(','), [ownedIds]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setCards([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: ids.length });
    fetchCardsByIds(ids, {
      signal: controller.signal,
      onProgress: (done, total) => setProgress({ done, total }),
    })
      .then(({ cards }) => setCards(cards))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [idsKey]);

  const stats = useMemo(() => aggregate(cards), [cards]);

  // Completitud sobre los sets iniciados (no sobre todos los sets existentes).
  const setMeta = useMemo(() => {
    const map = new Map();
    for (const s of setsData?.data || []) {
      map.set(s.code.toLowerCase(), { name: s.name, count: s.card_count, icon: s.icon_svg_uri });
    }
    return map;
  }, [setsData]);

  const { setsStarted, setsComplete, completionPct } = useMemo(() => {
    const entries = Object.entries(countsBySet).filter(([, n]) => n > 0);
    let ownedInStarted = 0;
    let totalInStarted = 0;
    let complete = 0;
    for (const [code, owned] of entries) {
      const meta = setMeta.get(code);
      if (!meta?.count) continue;
      ownedInStarted += Math.min(owned, meta.count);
      totalInStarted += meta.count;
      if (owned >= meta.count) complete += 1;
    }
    return {
      setsStarted: entries.length,
      setsComplete: complete,
      completionPct: totalInStarted ? Math.round((ownedInStarted / totalInStarted) * 100) : 0,
    };
  }, [countsBySet, setMeta]);

  const topSets = useMemo(() => {
    return Object.entries(countsBySet)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, owned]) => {
        const meta = setMeta.get(code);
        return {
          code,
          owned,
          name: meta?.name || code.toUpperCase(),
          count: meta?.count,
          icon: meta?.icon,
        };
      });
  }, [countsBySet, setMeta]);

  // Estado vacío
  if (totalOwned === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="font-display text-3xl">Estadísticas</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-slate-500 mb-4">
            Todavía no tenés cartas en tu colección, así que no hay nada para graficar.
          </p>
          <Link to="/collection" className="btn btn-primary">
            Ir a Mi Colección
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl">Estadísticas</h1>
        <p className="text-sm text-slate-500">
          Análisis de tus {totalOwned} {pluralize(totalOwned, 'carta')} por rareza, color, curva de
          maná, tipo y set.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label={pluralize(totalOwned, 'Carta', 'Cartas')} value={totalOwned} />
        <StatTile label="Sets iniciados" value={setsStarted} />
        <StatTile label="Sets completos" value={setsComplete} />
        <StatTile
          label="Completitud"
          value={`${completionPct}%`}
          hint="de los sets iniciados"
        />
        <StatTile
          label="Valor estimado"
          value={formatPrice(stats.usd)}
          hint="precios USD de Scryfall"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          Error cargando las cartas: {error.message}
        </div>
      )}

      {loading && (
        <Loader
          label={
            progress.total
              ? `Analizando cartas… ${progress.done}/${progress.total}`
              : 'Analizando cartas…'
          }
        />
      )}

      {!loading && !error && cards.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarChart title="Curva de maná" items={stats.curve} accent="bg-mtg-blue" />
            <BarChart title="Por tipo" items={stats.types} accent="bg-mtg-green" />
            <BarChart
              title="Por rareza"
              items={stats.rarity.map((r) => ({
                label: r.label,
                value: r.value,
                hex:
                  r.id === 'mythic'
                    ? '#F8991C'
                    : r.id === 'rare'
                      ? '#D5B45A'
                      : r.id === 'uncommon'
                        ? '#A8B0B8'
                        : '#94a3b8',
              }))}
            />
            <BarChart title="Por color" items={stats.colors} />
          </div>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="font-display text-lg mb-3">Top sets</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topSets.map((s) => {
                const pct = s.count ? Math.round((s.owned / s.count) * 100) : null;
                return (
                  <Link
                    key={s.code}
                    to={`/collection/${s.code}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    {s.icon && <img src={s.icon} alt="" className="w-6 h-6 dark:invert" loading="lazy" />}
                    <span className="flex-1 min-w-0 truncate font-medium">{s.name}</span>
                    <span className="text-sm text-slate-500 tabular-nums">
                      {s.owned}
                      {s.count ? ` / ${s.count}` : ''} {pct != null && `· ${pct}%`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
