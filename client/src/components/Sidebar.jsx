import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';

const STORAGE_KEY = 'mtg-gallery:sidebar-collapsed';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Página principal',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: '/collection',
    label: 'Mi Colección',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/wishlist',
    label: 'Mi Wishlist',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
        <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
      </svg>
    ),
  },
  {
    to: '/decks',
    label: 'Mis Mazos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
        <rect x="4" y="3" width="11" height="15" rx="1.5" />
        <path d="M8 7h3M8 10h3" />
        <path d="M17 6l3 1.2a1 1 0 01.6 1.3l-3.5 9.3a1 1 0 01-1.3.6L15 19" />
      </svg>
    ),
  },
  {
    to: '/stats',
    label: 'Estadísticas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="6" rx="0.5" />
        <rect x="12" y="7" width="3" height="10" rx="0.5" />
        <rect x="17" y="13" width="3" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    to: '/stores',
    label: 'Dónde comprar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M3 9h18v11H3z" />
        <path d="M9 13h6" />
      </svg>
    ),
  },
];

function readStored() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(readStored);
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Mismo look que los items de nav (fila con icono + label, colapsa a icono en lg).
  const rowClass = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
    collapsed ? 'lg:gap-0 lg:px-0 lg:justify-center' : ''
  }`;
  const labelClass = collapsed ? 'lg:hidden' : '';

  return (
    <aside
      className={`lg:flex-shrink-0 lg:border-r lg:border-slate-200 lg:dark:border-slate-800 border-b lg:border-b-0 border-slate-200 dark:border-slate-800 transition-[width] duration-200 ${
        collapsed ? 'lg:w-20' : 'lg:w-56'
      }`}
    >
      <div className="lg:sticky lg:top-14 p-2 lg:p-4">
        <div className="hidden lg:flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-md text-slate-500 hover:text-mtg-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  collapsed ? 'lg:gap-0 lg:px-0 lg:justify-center' : ''
                } ${
                  isActive
                    ? 'bg-mtg-blue text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.icon}
              <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Pie: tema + link a Scryfall (movidos desde el Header). En lg van separados
            por un borde; en mobile fluyen como filas más en la barra horizontal. */}
        <div className="flex lg:flex-col gap-1 lg:mt-2 lg:pt-2 lg:border-t lg:border-slate-200 lg:dark:border-slate-800">
          <button
            type="button"
            onClick={toggle}
            className={rowClass}
            title={collapsed ? (isDark ? 'Tema claro' : 'Tema oscuro') : undefined}
            aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
                <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
              </svg>
            )}
            <span className={labelClass}>{isDark ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>

          <a
            href="https://scryfall.com/docs/api"
            target="_blank"
            rel="noreferrer"
            className={rowClass}
            title={collapsed ? 'Scryfall API' : 'Documentación de la API Scryfall'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0" aria-hidden>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14L21 3" />
            </svg>
            <span className={labelClass}>Scryfall API</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
