import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { FiltersProvider } from './context/FiltersContext.jsx';
import { CacheProvider } from './context/CacheContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { CollectionProvider } from './context/CollectionContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <CollectionProvider>
              <CacheProvider>
                <FiltersProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </FiltersProvider>
              </CacheProvider>
            </CollectionProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
