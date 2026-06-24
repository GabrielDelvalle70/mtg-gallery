import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { user, isAuthenticated, logout, hydrating } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-wide">
          <span className="inline-block w-3 h-3 rounded-full bg-mtg-mythic shadow-glow" aria-hidden />
          <span>MTG Gallery</span>
        </Link>
        <nav className="flex items-center gap-2">
          {/* Autenticado: solo nombre + salir. El tema y el link a Scryfall viven en el Sidebar. */}
          {!hydrating && isAuthenticated && user && (
            <div className="flex items-center gap-2">
              <span className="chip" title={user.email}>
                <span className="inline-block w-2 h-2 rounded-full bg-mtg-green" aria-hidden />
                {user.username}
              </span>
              <button type="button" className="btn" onClick={onLogout}>
                Salir
              </button>
            </div>
          )}
          {/* Sin sesión no hay sidebar, así que el tema y Scryfall quedan acá. */}
          {!hydrating && !isAuthenticated && (
            <div className="flex items-center gap-2">
              <a
                className="btn hidden sm:inline-flex"
                href="https://scryfall.com/docs/api"
                target="_blank"
                rel="noreferrer"
                title="Documentación de la API Scryfall"
              >
                Scryfall API
              </a>
              <Link to="/login" className="btn">
                Iniciar sesión
              </Link>
              <Link to="/register" className="btn btn-primary">
                Registro
              </Link>
              <ThemeToggle />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
