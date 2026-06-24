import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoginTransition from '../components/LoginTransition.jsx';

export default function LoginPage() {
  const { authenticate, commitSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [welcomeUser, setWelcomeUser] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const session = await authenticate({ identifier: identifier.trim(), password });
      setWelcomeUser(session.user);
      // Mostramos la animación 2.5s; recién al final commiteamos la sesión y navegamos.
      // (isAuthenticated sigue false hasta el commit, así GuestOnly no nos saca antes.)
      setTimeout(() => {
        commitSession(session);
        navigate(redirectTo, { replace: true });
      }, 2500);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (welcomeUser) return <LoginTransition username={welcomeUser.username} />;

  return (
    <div className="max-w-md mx-auto mt-8 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card">
        <h1 className="font-display text-2xl mb-1">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 mb-6">Accedé con tu email o username.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              Email o username
            </label>
            <input
              id="identifier"
              className="input"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              Contraseña
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-mtg-red/40 bg-mtg-red/10 px-3 py-2 text-sm text-mtg-red">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-slate-500">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-mtg-blue hover:underline">
            Crear una
          </Link>
        </p>
      </div>
    </div>
  );
}
