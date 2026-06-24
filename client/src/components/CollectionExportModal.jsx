import { useEffect, useMemo, useState } from 'react';
import { fetchCardsByIds } from '../services/scryfall.js';
import {
  COLLECTION_EXPORT_FORMATS,
  buildCollectionExport,
  collectionExportFilename,
  collectionExportMime,
} from '../utils/collectionExport.js';
import { downloadText } from '../utils/deckExport.js';
import { pluralize } from '../utils/format.js';

// Resuelve la data completa de las cartas poseídas (la DB solo guarda id/set/name)
// y ofrece exportar a CSV o JSON. Mismo patrón de fetch que CollectionStatsPage.
export default function CollectionExportModal({ ownedIds, onClose }) {
  const [cards, setCards] = useState([]);
  const [notFound, setNotFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [fmt, setFmt] = useState('csv');
  const [copied, setCopied] = useState(false);

  const idsKey = useMemo(() => [...ownedIds].sort().join(','), [ownedIds]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setLoading(false);
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
      .then(({ cards, notFound }) => {
        setCards(cards);
        setNotFound(notFound);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [idsKey]);

  const text = useMemo(() => (cards.length ? buildCollectionExport(cards, fmt) : ''), [cards, fmt]);

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
      aria-label="Exportar colección"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Exportar colección</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
          {COLLECTION_EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFmt(f.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                fmt === f.id
                  ? 'bg-mtg-blue text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-pressed={fmt === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm text-slate-500">
            {progress.total
              ? `Resolviendo cartas… ${progress.done}/${progress.total}`
              : 'Resolviendo cartas…'}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Error trayendo las cartas: {error.message}
          </p>
        )}

        {!loading && !error && (
          <>
            <p className="text-xs text-slate-500">
              {cards.length} {pluralize(cards.length, 'carta')} listas para exportar
              {notFound > 0 && ` · ${notFound} no se pudieron resolver`}.
            </p>
            <textarea
              readOnly
              value={text}
              className="input font-mono text-xs h-56 resize-none scrollbar-thin"
              onFocus={(e) => e.target.select()}
            />
          </>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            className="btn"
            disabled={!text}
            onClick={() =>
              downloadText(collectionExportFilename(fmt), text, collectionExportMime(fmt))
            }
          >
            Descargar .{fmt}
          </button>
          <button type="button" className="btn btn-primary" disabled={!text} onClick={onCopy}>
            {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
          </button>
        </div>
      </div>
    </div>
  );
}
