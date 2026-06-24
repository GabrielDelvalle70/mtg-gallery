import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCollection } from '../context/CollectionContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { searchUrl, fetchCardsByIds, fetchCardCollection } from '../services/scryfall.js';
import { decksApi, FORMATS, MIN_DECK_SIZE, formatLabel } from '../services/decks.js';
import { parseDecklist, matchResolved } from '../utils/deckImport.js';
import { ownsCard } from '../utils/ownership.js';
import { rarityLabel } from '../utils/rarity.js';
import { COLORS } from '../utils/colors.js';
import {
  EXPORT_FORMATS,
  buildDecklist,
  decklistFilename,
  downloadText,
  hasPendingCards,
} from '../utils/deckExport.js';
import ManaCost from '../components/ManaCost.jsx';
import Loader from '../components/Loader.jsx';

const CMC_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

function typeLine(card) {
  return (card?.type_line || card?.card_faces?.[0]?.type_line || '').split('//')[0];
}
function isLand(card) {
  return /\bLand\b/.test(typeLine(card));
}
function isBasicLand(card) {
  const tl = typeLine(card);
  return /\bBasic\b/.test(tl) && /\bLand\b/.test(tl);
}

// ── Agregaciones del mazo (ponderadas por cantidad) ──────────────────────────
function deckStats(deckList) {
  const curve = CMC_BUCKETS.map((b) => ({ label: b, value: 0 }));
  const colors = [
    ...COLORS.map((c) => ({ id: c.id, label: c.label, hex: c.hex, value: 0 })),
    { id: 'M', label: 'Multicolor', hex: '#F8991C', value: 0 },
    { id: 'C', label: 'Incoloro', hex: '#CAC5C0', value: 0 },
  ];
  let total = 0;
  let lands = 0;
  for (const { card, quantity } of deckList) {
    total += quantity;
    if (!card) continue;
    if (isLand(card)) {
      lands += quantity;
    } else if (typeof card.cmc === 'number') {
      curve[Math.min(7, Math.floor(card.cmc))].value += quantity;
    }
    const cs = card.colors || card.card_faces?.[0]?.colors || [];
    if (isLand(card)) continue; // las tierras no cuentan al breakdown de color
    if (cs.length === 0) colors.find((c) => c.id === 'C').value += quantity;
    else if (cs.length >= 2) colors.find((c) => c.id === 'M').value += quantity;
    else colors.find((c) => c.id === cs[0])?.value !== undefined && (colors.find((c) => c.id === cs[0]).value += quantity);
  }
  return { total, lands, curve, colors: colors.filter((c) => c.value > 0) };
}

// ── Validación de legalidad (constructed) ────────────────────────────────────
function legalityCheck(deckList, format, total) {
  const issues = [];
  if (total < MIN_DECK_SIZE) {
    issues.push({ level: 'warn', text: `Faltan ${MIN_DECK_SIZE - total} cartas para el mínimo de ${MIN_DECK_SIZE}.` });
  }
  for (const { card, quantity } of deckList) {
    if (!card) continue;
    const name = card.name;
    const status = card.legalities?.[format];
    if (status === 'banned') issues.push({ level: 'error', text: `${name}: baneada en ${formatLabel(format)}.` });
    else if (status === 'not_legal') issues.push({ level: 'error', text: `${name}: no es legal en ${formatLabel(format)}.` });
    else if (status === 'restricted' && quantity > 1) issues.push({ level: 'error', text: `${name}: restringida (máx 1).` });
    if (quantity > 4 && !isBasicLand(card)) {
      issues.push({ level: 'error', text: `${name}: ${quantity} copias (máx 4).` });
    }
  }
  const isLegal = issues.filter((i) => i.level === 'error').length === 0 && total >= MIN_DECK_SIZE;
  return { issues, isLegal };
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBars({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 truncate text-slate-500">{i.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${i.hex ? '' : 'bg-mtg-blue'}`}
              style={{ width: `${(i.value / max) * 100}%`, ...(i.hex ? { backgroundColor: i.hex } : {}) }}
            />
          </div>
          <span className="w-6 text-right tabular-nums">{i.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DeckEditorPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { ownedNames, ownsName } = useCollection();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [format, setFormat] = useState('standard');
  const [entries, setEntries] = useState({}); // { cardId: { setCode, quantity } }
  const [cardsById, setCardsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [search, setSearch] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const mergeCards = (list) =>
    setCardsById((prev) => {
      const next = { ...prev };
      for (const c of list) next[c.id] = c;
      return next;
    });

  // Recarga las cantidades del mazo desde el server (tras un import bulk) y trae
  // la data de cualquier carta que aún no esté en cache.
  async function refreshDeck() {
    const { deck } = await decksApi.get(token, id);
    const obj = {};
    deck.cards.forEach((c) => (obj[c.id] = { setCode: c.setCode, quantity: c.quantity }));
    setEntries(obj);
    const missing = deck.cards.map((c) => c.id).filter((cid) => !cardsById[cid]);
    if (missing.length) {
      const { cards } = await fetchCardsByIds(missing);
      mergeCards(cards);
    }
  }

  // Cargar el mazo + data de sus cartas.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    decksApi
      .get(token, id)
      .then(({ deck }) => {
        setName(deck.name);
        setFormat(deck.format);
        const obj = {};
        deck.cards.forEach((c) => (obj[c.id] = { setCode: c.setCode, quantity: c.quantity }));
        setEntries(obj);
        const ids = deck.cards.map((c) => c.id);
        if (ids.length) {
          return fetchCardsByIds(ids, { signal: controller.signal }).then(({ cards }) => mergeCards(cards));
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 404) setNotFound(true);
        else setError(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, id]);

  // Buscador interno (Scryfall vía useFetch, sólo cuando hay query enviada).
  const url = submittedQ.trim() ? searchUrl({ q: submittedQ.trim(), page: 1 }) : null;
  const { data: searchData, loading: searching, error: searchError } = useFetch(url, { deps: [url] });
  const results = searchData?.data ?? [];

  async function saveMeta(nextName, nextFormat) {
    try {
      await decksApi.update(token, id, { name: nextName, format: nextFormat });
    } catch (err) {
      setError(err);
    }
  }

  async function setQty(card, qty) {
    const cardId = card.id;
    const setCode = (card.set || card.set_code || entries[cardId]?.setCode || '').toLowerCase();
    const prevQty = entries[cardId]?.quantity || 0;
    // Solo se puede agregar/aumentar lo que está en la colección (match por nombre).
    // Reducir o quitar siempre se permite (mismo criterio que el server).
    if (qty > prevQty && !ownsCard(card, ownedNames)) {
      setError(new Error(`No tenés "${card.name}" en tu colección, no podés agregarla al mazo.`));
      return;
    }
    setError(null);
    mergeCards([card]);
    const prev = entries;
    setEntries((e) => {
      const next = { ...e };
      if (qty > 0) next[cardId] = { setCode, quantity: qty };
      else delete next[cardId];
      return next;
    });
    try {
      await decksApi.setCard(token, id, cardId, setCode, qty, card.name);
    } catch (err) {
      setEntries(prev); // rollback
      setError(err);
    }
  }

  // Lista del mazo ordenada por costo de maná y nombre.
  const deckList = useMemo(() => {
    return Object.entries(entries)
      .map(([cardId, e]) => ({ cardId, quantity: e.quantity, setCode: e.setCode, card: cardsById[cardId] }))
      .sort((a, b) => {
        const ca = a.card?.cmc ?? 99;
        const cb = b.card?.cmc ?? 99;
        if (ca !== cb) return ca - cb;
        return (a.card?.name || '').localeCompare(b.card?.name || '');
      });
  }, [entries, cardsById]);

  const stats = useMemo(() => deckStats(deckList), [deckList]);
  const legality = useMemo(() => legalityCheck(deckList, format, stats.total), [deckList, format, stats.total]);

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-3">Este mazo no existe o no es tuyo.</p>
        <Link to="/decks" className="btn btn-primary">Volver a mis mazos</Link>
      </div>
    );
  }
  if (loading) return <Loader label="Cargando mazo…" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/decks" className="btn w-fit">← Mis mazos</Link>

      <header className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <input
            className="input text-xl font-display"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => saveMeta(name.trim() || 'Mazo sin nombre', format)}
            maxLength={80}
            aria-label="Nombre del mazo"
          />
        </div>
        <div className="sm:w-48">
          <select
            className="input"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value);
              saveMeta(name.trim() || 'Mazo sin nombre', e.target.value);
            }}
            aria-label="Formato"
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn" onClick={() => setImportOpen(true)} title="Importar decklist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 15V3M8 7l4-4 4 4" />
            <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
          </svg>
          Importar
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setExportOpen(true)}
          disabled={deckList.length === 0}
          title="Exportar decklist"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12M8 11l4 4 4-4" />
            <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
          </svg>
          Exportar
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error.message}
        </div>
      )}

      {/* Resumen + legalidad */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid gap-4 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-2xl">{stats.total}</span>
            <span className="text-sm text-slate-500">cartas · {stats.lands} tierras</span>
          </div>
          <span
            className={`chip ${
              legality.isLegal
                ? 'bg-mtg-green/15 text-mtg-green'
                : 'bg-mtg-red/15 text-mtg-red'
            }`}
          >
            {legality.isLegal ? `Legal en ${formatLabel(format)}` : `No legal en ${formatLabel(format)}`}
          </span>
          {legality.issues.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {legality.issues.slice(0, 8).map((iss, idx) => (
                <li key={idx} className={iss.level === 'error' ? 'text-mtg-red' : 'text-amber-600 dark:text-amber-400'}>
                  • {iss.text}
                </li>
              ))}
              {legality.issues.length > 8 && (
                <li className="text-slate-500">…y {legality.issues.length - 8} más</li>
              )}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Curva de maná</h3>
          <MiniBars items={stats.curve} />
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Colores</h3>
          {stats.colors.length ? <MiniBars items={stats.colors} /> : <p className="text-xs text-slate-500">Sin datos.</p>}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* En el mazo */}
        <section className="space-y-3">
          <h2 className="font-display text-xl">En el mazo</h2>
          {deckList.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              El mazo está vacío. Buscá cartas a la derecha y agregalas.
            </p>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {deckList.map(({ cardId, quantity, card }) => (
                <DeckRow
                  key={cardId}
                  card={card}
                  quantity={quantity}
                  format={format}
                  owned={card ? ownsName(card.name) : true}
                  onInc={() => card && setQty(card, quantity + 1)}
                  onDec={() => card && setQty(card, quantity - 1)}
                  onRemove={() => card && setQty(card, 0)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Agregar cartas */}
        <section className="space-y-3">
          <h2 className="font-display text-xl">Agregar cartas</h2>
          <p className="text-xs text-slate-500">
            Solo podés agregar cartas que tengas en tu colección. Las que no tenés aparecen
            deshabilitadas.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedQ(search);
            }}
            className="flex gap-2"
          >
            <input
              className="input"
              type="search"
              placeholder="Buscar carta por nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Buscar</button>
          </form>

          {searchError && searchError.status !== 404 && (
            <p className="text-sm text-mtg-red">{searchError.message}</p>
          )}
          {searching && <Loader label="Buscando…" />}
          {submittedQ && !searching && (results.length === 0 || searchError?.status === 404) && (
            <p className="text-sm text-slate-500">Sin resultados para “{submittedQ}”.</p>
          )}

          {results.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {results.map((card) => (
                <SearchRow
                  key={card.id}
                  card={card}
                  inDeck={entries[card.id]?.quantity || 0}
                  owned={ownsName(card.name)}
                  onAdd={() => setQty(card, (entries[card.id]?.quantity || 0) + 1)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {exportOpen && (
        <ExportModal deckList={deckList} deckName={name} onClose={() => setExportOpen(false)} />
      )}
      {importOpen && (
        <ImportModal
          token={token}
          deckId={id}
          ownsName={ownsName}
          onApplied={async (cards) => {
            mergeCards(cards);
            await refreshDeck();
          }}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}

// ── Modal de importar decklist ────────────────────────────────────────────────
function ImportModal({ token, deckId, ownsName, onApplied, onClose }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('add');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  async function onImport() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const { lines } = parseDecklist(text);
      if (lines.length === 0) {
        setError(new Error('No se reconocieron cartas en el texto.'));
        return;
      }
      const { cards } = await fetchCardCollection(lines.map((l) => ({ name: l.name })));
      const { resolved, notFound } = matchResolved(lines, cards);
      // Solo se importan las cartas que están en la colección (match por nombre); las
      // que se resolvieron en Scryfall pero no poseés se saltean y se reportan aparte.
      const owned = resolved.filter((r) => ownsName(r.card.name));
      const notOwned = resolved.filter((r) => !ownsName(r.card.name)).map((r) => r.card.name);
      if (owned.length > 0) {
        const payload = owned.map((r) => ({
          cardId: r.card.id,
          setCode: r.card.set,
          quantity: r.quantity,
          name: r.card.name,
        }));
        await decksApi.import(token, deckId, payload, mode);
        await onApplied(owned.map((r) => r.card));
      }
      const copies = owned.reduce((a, r) => a + r.quantity, 0);
      setSummary({ cards: owned.length, copies, notFound, notOwned });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Importar decklist"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Importar decklist</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Pegá una lista (una carta por línea, ej. <code>4 Lightning Bolt</code>). Soporta formato
          MTGO, Moxfield y Arena. Solo se importan las cartas que tengas en tu colección.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'4 Lightning Bolt\n2 Counterspell\n20 Island'}
          className="input font-mono text-xs h-44 resize-none scrollbar-thin"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Al importar:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
            {[
              { id: 'add', label: 'Agregar' },
              { id: 'replace', label: 'Reemplazar' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setMode(o.id)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  mode === o.id ? 'bg-mtg-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-pressed={mode === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-mtg-red">{error.message}</p>}

        {summary && (
          <div className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
            <p className={summary.cards > 0 ? 'text-mtg-green font-medium' : 'text-slate-500 font-medium'}>
              Importadas {summary.cards} cartas ({summary.copies} copias) en modo {mode === 'add' ? 'agregar' : 'reemplazar'}.
            </p>
            {summary.notOwned.length > 0 && (
              <div className="text-amber-600 dark:text-amber-400">
                <p>{summary.notOwned.length} no están en tu colección (no se agregaron):</p>
                <p className="text-xs">{summary.notOwned.slice(0, 12).join(', ')}{summary.notOwned.length > 12 ? '…' : ''}</p>
              </div>
            )}
            {summary.notFound.length > 0 && (
              <div className="text-amber-600 dark:text-amber-400">
                <p>No se encontraron {summary.notFound.length}:</p>
                <p className="text-xs">{summary.notFound.slice(0, 12).join(', ')}{summary.notFound.length > 12 ? '…' : ''}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            {summary ? 'Cerrar' : 'Cancelar'}
          </button>
          <button type="button" className="btn btn-primary" onClick={onImport} disabled={busy || !text.trim()}>
            {busy ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de exportar decklist ────────────────────────────────────────────────
function ExportModal({ deckList, deckName, onClose }) {
  const [fmt, setFmt] = useState('mtgo');
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => buildDecklist(deckList, fmt), [deckList, fmt]);
  const pending = hasPendingCards(deckList);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Exportar decklist"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Exportar decklist</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFmt(f.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                fmt === f.id ? 'bg-mtg-blue text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-pressed={fmt === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {pending && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Algunas cartas todavía están cargando y pueden faltar en la lista.
          </p>
        )}

        <textarea
          readOnly
          value={text}
          className="input font-mono text-xs h-56 resize-none scrollbar-thin"
          onFocus={(e) => e.target.select()}
        />

        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" className="btn" onClick={() => downloadText(decklistFilename(deckName), text)}>
            Descargar .txt
          </button>
          <button type="button" className="btn btn-primary" onClick={onCopy}>
            {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filas ─────────────────────────────────────────────────────────────────────
function thumb(card) {
  const face = card?.image_uris ? card : card?.card_faces?.[0];
  return face?.image_uris?.small ?? null;
}

function DeckRow({ card, quantity, format, owned, onInc, onDec, onRemove }) {
  const status = card?.legalities?.[format];
  const illegal = status === 'banned' || status === 'not_legal';
  const year = card?.released_at ? card.released_at.slice(0, 4) : null;
  return (
    <div className="flex items-center gap-3 p-2">
      {thumb(card) ? (
        <img src={thumb(card)} alt="" className="w-9 h-12 object-cover rounded shadow-sm flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-9 h-12 rounded bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate flex items-center gap-1.5">
          {illegal && <span className="inline-block w-2 h-2 rounded-full bg-mtg-red" title="No legal en este formato" />}
          {card ? (
            <Link to={`/card/${card.id}`} state={{ card }} className="hover:text-mtg-blue truncate">
              {card.name}
            </Link>
          ) : (
            'Cargando…'
          )}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {card?.set_name}
          {year ? ` · ${year}` : ''}
          {card ? ` · ${rarityLabel(card.rarity)}` : ''}
          {card && !owned && (
            <span className="text-amber-600 dark:text-amber-400"> · no en tu colección</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button type="button" onClick={onDec} className="btn px-2 py-1" aria-label="Quitar una copia">−</button>
        <span className="w-7 text-center tabular-nums font-semibold">{quantity}</span>
        <button
          type="button"
          onClick={onInc}
          className="btn px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Agregar una copia"
          disabled={!owned}
          title={owned ? 'Agregar una copia' : 'No tenés esta carta en tu colección'}
        >
          +
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-mtg-red hover:bg-mtg-red/10"
          aria-label="Quitar del mazo"
          title="Quitar del mazo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SearchRow({ card, inDeck, owned, onAdd }) {
  return (
    <div className={`flex items-center gap-3 p-2 ${owned ? '' : 'opacity-60'}`}>
      {thumb(card) ? (
        <img src={thumb(card)} alt="" className="w-9 h-12 object-cover rounded shadow-sm flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-9 h-12 rounded bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{card.name}</p>
        <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
          {card.mana_cost ? <ManaCost cost={card.mana_cost} /> : null}
          <span className="truncate">{card.set_name} · {rarityLabel(card.rarity)}</span>
        </p>
      </div>
      {inDeck > 0 && <span className="chip flex-shrink-0">{inDeck} en mazo</span>}
      {owned ? (
        <button type="button" onClick={onAdd} className="btn btn-primary px-3 py-1 flex-shrink-0" aria-label={`Agregar ${card.name} al mazo`}>
          + Agregar
        </button>
      ) : (
        <span className="chip flex-shrink-0 text-amber-600 dark:text-amber-400" title="No tenés esta carta en tu colección">
          No la tenés
        </span>
      )}
    </div>
  );
}
