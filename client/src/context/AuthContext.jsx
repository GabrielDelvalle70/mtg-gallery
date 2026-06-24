import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/auth.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'mtg-gallery:token';
const USER_KEY = 'mtg-gallery:user';

function readStored() {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    return { token, user: userRaw ? JSON.parse(userRaw) : null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setState] = useState(readStored);
  const [hydrating, setHydrating] = useState(Boolean(readStored().token));

  useEffect(() => {
    if (!token) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    authApi
      .me(token)
      .then((data) => {
        if (cancelled) return;
        setState((s) => ({ ...s, user: data.user }));
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setState({ token: null, user: null });
        }
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const persist = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setState({ token: nextToken, user: nextUser });
  }, []);

  // authenticate/registerAccount validan credenciales y devuelven { token, user }
  // pero NO commitean la sesión al contexto. El commit (que dispara isAuthenticated)
  // se hace aparte con commitSession, así LoginPage/RegisterPage pueden mostrar la
  // animación de bienvenida sin que GuestOnly redirija al instante y la desmonte.
  const authenticate = useCallback(
    ({ identifier, password }) => authApi.login({ identifier, password }),
    [],
  );

  const registerAccount = useCallback(
    ({ email, username, password }) => authApi.register({ email, username, password }),
    [],
  );

  const commitSession = useCallback(
    ({ token: nextToken, user: nextUser }) => persist(nextToken, nextUser),
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      hydrating,
      isAuthenticated: Boolean(user),
      authenticate,
      registerAccount,
      commitSession,
      logout,
    }),
    [user, token, hydrating, authenticate, registerAccount, commitSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
