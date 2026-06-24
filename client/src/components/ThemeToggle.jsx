import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn"
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <span aria-hidden>{isDark ? '☀️' : '🌙'}</span>
      <span className="hidden sm:inline">{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
