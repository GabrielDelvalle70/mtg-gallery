import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { decksApi, FORMATS, formatLabel } from '../services/decks.js';
import { formatDate } from '../utils/format.js';
import Loader from '../components/Loader.jsx';

export default function DecksPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [format, setFormat] = useState('standard');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    decksApi
      .list(token)
      .then((data) => !cancelled && setDecks(data.decks))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onCreate(e) {
    e.preventDefault();
    if (creating || !name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { deck } = await decksApi.create(token, name.trim(), format);
      navigate(`/decks/${deck.id}`);
    } catch (err) {
      setError(err);
      setCreating(false);
    }
  }

  async function onDelete(deck) {
    if (!window.confirm(`¿Eliminar el mazo “${deck.name}”? Esta acción no se puede deshacer.`)) {
      return;
    }
    const prev = decks;
    setDecks((d) => d.filter((x) => x.id !== deck.id)); // optimista
    try {
      await decksApi.remove(token, deck.id);
    } catch (err) {
      setDecks(prev); // rollback
      setError(err);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Mis Mazos</h1>
          <p className="text-sm text-slate-500">Armá mazos y validá su legalidad por formato.</p>
        </div>
        <Link to="/decks/reference" className="btn w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          Mazos competitivos populares
        </Link>
      </header>

      <form
        onSubmit={onCreate}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="deck-name" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
            Nombre del mazo
          </label>
          <input
            id="deck-name"
            className="input"
            placeholder="Ej: Mono Red Aggro"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="deck-format" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
            Formato
          </label>
          <select
            id="deck-format"
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
          {creating ? 'Creando…' : 'Crear mazo'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error.message}
        </div>
      )}

      {loading && <Loader label="Cargando mazos…" />}

      {!loading && decks.length === 0 && (
        <p className="text-center py-12 text-slate-500">
          Todavía no tenés mazos. Creá el primero arriba.
        </p>
      )}

      {decks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-mtg-blue transition-colors"
            >
              <Link to={`/decks/${deck.id}`} className="absolute inset-0 z-10 rounded-xl" aria-label={`Editar ${deck.name}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{deck.name}</p>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {formatLabel(deck.format)} · {deck.cardCount} {deck.cardCount === 1 ? 'carta' : 'cartas'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(deck)}
                  className="relative z-20 p-1.5 rounded-md text-slate-400 hover:text-mtg-red hover:bg-mtg-red/10 transition-colors"
                  aria-label={`Eliminar ${deck.name}`}
                  title="Eliminar mazo"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3">Editado {formatDate(deck.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
