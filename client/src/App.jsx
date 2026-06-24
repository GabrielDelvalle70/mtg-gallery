import { lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Loader from './components/Loader.jsx';
import { useAuth } from './context/AuthContext.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const CardDetailPage = lazy(() => import('./pages/CardDetailPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const CollectionPage = lazy(() => import('./pages/CollectionPage.jsx'));
const CollectionSetPage = lazy(() => import('./pages/CollectionSetPage.jsx'));
const CollectionStatsPage = lazy(() => import('./pages/CollectionStatsPage.jsx'));
const WishlistPage = lazy(() => import('./pages/WishlistPage.jsx'));
const DecksPage = lazy(() => import('./pages/DecksPage.jsx'));
const ReferenceDecksPage = lazy(() => import('./pages/ReferenceDecksPage.jsx'));
const DeckEditorPage = lazy(() => import('./pages/DeckEditorPage.jsx'));
const StoresPage = lazy(() => import('./pages/StoresPage.jsx'));

function HomeRoute() {
  const { isAuthenticated, hydrating } = useAuth();
  if (hydrating) return <Loader label="Cargando sesión…" />;
  return isAuthenticated ? <HomePage /> : <LandingPage />;
}

function GuestOnly({ children }) {
  const { isAuthenticated, hydrating } = useAuth();
  if (hydrating) return <Loader label="Cargando sesión…" />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

function RequireAuth({ children }) {
  const { isAuthenticated, hydrating } = useAuth();
  const location = useLocation();
  if (hydrating) return <Loader label="Cargando sesión…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, hydrating } = useAuth();
  const showSidebar = !hydrating && isAuthenticated;

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <div className="flex-1 w-full mx-auto max-w-7xl flex flex-col lg:flex-row">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0 px-4 py-6">
          <Suspense fallback={<Loader label="Cargando vista…" />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/card/:id" element={<CardDetailPage />} />
              <Route
                path="/collection"
                element={
                  <RequireAuth>
                    <CollectionPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/stats"
                element={
                  <RequireAuth>
                    <CollectionStatsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <RequireAuth>
                    <WishlistPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/decks"
                element={
                  <RequireAuth>
                    <DecksPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/decks/reference"
                element={
                  <RequireAuth>
                    <ReferenceDecksPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/decks/:id"
                element={
                  <RequireAuth>
                    <DeckEditorPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/collection/:setCode"
                element={
                  <RequireAuth>
                    <CollectionSetPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/stores"
                element={
                  <RequireAuth>
                    <StoresPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/login"
                element={
                  <GuestOnly>
                    <LoginPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestOnly>
                    <RegisterPage />
                  </GuestOnly>
                }
              />
              <Route
                path="*"
                element={
                  <div className="text-center py-20">
                    <h2 className="text-2xl font-display mb-3">Ruta no encontrada</h2>
                    <Link to="/" className="btn btn-primary">
                      Volver al inicio
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500">
        Datos provistos por{' '}
        <a className="underline hover:text-mtg-blue" href="https://scryfall.com" target="_blank" rel="noreferrer">
          Scryfall
        </a>
        . Magic: The Gathering © Wizards of the Coast.
      </footer>
    </div>
  );
}
