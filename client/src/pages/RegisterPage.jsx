import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoginTransition from '../components/LoginTransition.jsx';

export default function RegisterPage() {
  const { registerAccount, commitSession } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [welcomeUser, setWelcomeUser] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const session = await registerAccount({
        email: email.trim(),
        username: username.trim(),
        password,
      });
      setWelcomeUser(session.user);
      // Animación 2.5s, luego commit + navegación (ver nota en AuthContext/LoginPage).
      setTimeout(() => {
        commitSession(session);
        navigate('/', { replace: true });
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
        <h1 className="font-display text-2xl mb-1">Crear cuenta</h1>
        <p className="text-sm text-slate-500 mb-6">Registrate para guardar tu colección.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              Username <span className="text-slate-400">(3-24, alfanumérico o _)</span>
            </label>
            <input
              id="username"
              className="input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              pattern="[a-zA-Z0-9_]{3,24}"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              Contraseña <span className="text-slate-400">(mín. 8 caracteres)</span>
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-mtg-red/40 bg-mtg-red/10 px-3 py-2 text-sm text-mtg-red">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-slate-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-mtg-blue hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
