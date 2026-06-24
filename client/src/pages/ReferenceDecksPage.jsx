import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCollection } from '../context/CollectionContext.jsx';
import { fetchCardCollection } from '../services/scryfall.js';
import { decksApi, FORMATS, formatLabel } from '../services/decks.js';
import { matchResolved } from '../utils/deckImport.js';
import { COLORS } from '../utils/colors.js';
import { REFERENCE_DECKS } from '../data/referenceDecks.js';

function ColorPips({ colors }) {
  if (!colors?.length) return <span className="text-xs text-slate-400">Incoloro</span>;
  return (
    <span className="inline-flex gap-1">
      {colors.map((id) => {
        const hex = COLORS.find((c) => c.id === id)?.hex ?? '#CAC5C0';
        return (
          <span
            key={id}
            className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"
            style={{ backgroundColor: hex }}
            title={COLORS.find((c) => c.id === id)?.label ?? id}
          />
        );
      })}
    </span>
  );
}

export default function ReferenceDecksPage() {
  const { token } = useAuth();
  const { ownsName } = useCollection();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(null); // id del arquetipo en proceso
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // resumen cuando se saltearon cartas no poseídas

  const decks = useMemo(
    () => (filter === 'all' ? REFERENCE_DECKS : REFERENCE_DECKS.filter((d) => d.format === filter)),
    [filter],
  );

  // Formatos que efectivamente aparecen en la lista (para el filtro).
  const formatsPresent = useMemo(() => {
    const set = new Set(REFERENCE_DECKS.map((d) => d.format));
    return FORMATS.filter((f) => set.has(f.id));
  }, []);

  async function createBaseDeck(archetype) {
    if (creating) return;
    setCreating(archetype.id);
    setError(null);
    setResult(null);
    try {
      const { cards } = await fetchCardCollection(archetype.keyCards.map((k) => ({ name: k.name })));
      const { resolved } = matchResolved(archetype.keyCards, cards);
      // Solo se agregan al mazo base las cartas clave que tengas en tu colección.
      const owned = resolved.filter((r) => ownsName(r.card.name));
      const skipped = resolved.filter((r) => !ownsName(r.card.name)).map((r) => r.card.name);
      const { deck } = await decksApi.create(token, archetype.name, archetype.format);
      if (owned.length > 0) {
        const payload = owned.map((r) => ({
          cardId: r.card.id,
          setCode: r.card.set,
          quantity: r.quantity,
          name: r.card.name,
        }));
        await decksApi.import(token, deck.id, payload, 'add');
      }
      // Si entraron todas, vamos directo al editor; si se saltearon cartas, mostramos
      // el resumen para que Gabriel vea qué quedó afuera antes de abrir el mazo.
      if (skipped.length === 0) {
        navigate(`/decks/${deck.id}`);
      } else {
        setResult({ deckId: deck.id, name: archetype.name, imported: owned.length, skipped });
        setCreating(null);
      }
    } catch (err) {
      setError(err);
      setCreating(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/decks" className="btn w-fit">← Mis mazos</Link>

      <header>
        <h1 className="font-display text-3xl">Mazos competitivos populares</h1>
        <p className="text-sm text-slate-500">
          Arquetipos conocidos como referencia para armar tu propio mazo. Se muestran las{' '}
          <strong>cartas clave</strong> de cada uno; la lista completa y actualizada está en la
          fuente linkeada (las listas rotan seguido). Podés crear un mazo base con esas cartas y
          completarlo a tu gusto. <strong>Solo se agregan las cartas clave que tengas en tu
          colección</strong>; las demás se omiten.
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : ''}`}
        >
          Todos
        </button>
        {formatsPresent.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`btn ${filter === f.id ? 'btn-primary' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error.message}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm space-y-2">
          <p className="text-amber-800 dark:text-amber-200">
            Mazo «{result.name}» creado con {result.imported} carta{result.imported === 1 ? '' : 's'} clave de tu
            colección. {result.skipped.length} no las tenés y se omitieron:
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {result.skipped.slice(0, 15).join(', ')}{result.skipped.length > 15 ? '…' : ''}
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/decks/${result.deckId}`)}>
              Abrir mazo
            </button>
            <button type="button" className="btn" onClick={() => setResult(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {decks.map((deck) => (
          <article
            key={deck.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-xl truncate">{deck.name}</h2>
                <span className="chip mt-1">{formatLabel(deck.format)}</span>
              </div>
              <ColorPips colors={deck.colors} />
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">{deck.description}</p>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Cartas clave</p>
              <div className="flex flex-wrap gap-1.5">
                {deck.keyCards.map((c) => (
                  <span key={c.name} className="chip">
                    {c.quantity}× {c.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => createBaseDeck(deck)}
                disabled={!!creating}
              >
                {creating === deck.id ? 'Creando…' : 'Crear mazo base'}
              </button>
              <a className="btn" href={deck.source} target="_blank" rel="noreferrer">
                Ver lista completa ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
