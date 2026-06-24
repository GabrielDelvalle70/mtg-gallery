import { useEffect, useMemo, useState } from 'react';
import {
  ONLINE_STORES,
  PHYSICAL_STORES,
  COUNTRIES,
  DEFAULT_COUNTRY,
  haversineKm,
} from '../data/stores.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { reverseGeocode } from '../services/geocode.js';
import { fetchNearbyShops } from '../services/overpass.js';

export default function StoresPage() {
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [geocoding, setGeocoding] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState(null);
  const { coords, status, error, request, clear } = useGeolocation();

  const [osmShops, setOsmShops] = useState([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState(null);

  useEffect(() => {
    if (status !== 'granted' || !coords) return;
    let cancelled = false;
    setGeocoding(true);
    reverseGeocode(coords.lat, coords.lon)
      .then((data) => {
        if (cancelled) return;
        const code = data?.countryCode?.toUpperCase();
        if (code) {
          setDetectedCountry({ code, name: data.countryName || code });
          if (COUNTRIES.some((c) => c.code === code)) setCountry(code);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, coords]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);
  const queryPoint = useMemo(() => {
    if (coords) return { lat: coords.lat, lon: coords.lon, label: 'tu ubicación' };
    if (selectedCountry?.mainCity) {
      return {
        lat: selectedCountry.mainCity.lat,
        lon: selectedCountry.mainCity.lon,
        label: selectedCountry.name,
      };
    }
    return null;
  }, [coords, selectedCountry]);

  useEffect(() => {
    if (!queryPoint) {
      setOsmShops([]);
      return;
    }
    const ctrl = new AbortController();
    setOsmLoading(true);
    setOsmError(null);
    fetchNearbyShops(queryPoint.lat, queryPoint.lon, 50000, ctrl.signal)
      .then((shops) => setOsmShops(shops))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setOsmError(err);
          setOsmShops([]);
        }
      })
      .finally(() => setOsmLoading(false));
    return () => ctrl.abort();
  }, [queryPoint?.lat, queryPoint?.lon]);

  const visibleStores = useMemo(() => {
    const curated = (coords
      ? PHYSICAL_STORES
      : PHYSICAL_STORES.filter((s) => s.country === country)
    ).map((s) => ({ ...s, source: 'curated' }));
    const combined = [...curated, ...osmShops];
    if (!queryPoint) return combined;
    return combined
      .map((s) => ({
        ...s,
        distanceKm: haversineKm(queryPoint.lat, queryPoint.lon, s.lat, s.lon),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [country, coords, osmShops, queryPoint]);

  const detectedNotInList =
    detectedCountry && !COUNTRIES.some((c) => c.code === detectedCountry.code);

  return (
    <div className="space-y-10 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl">Dónde conseguir cartas y sets de Magic: The Gathering</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Tiendas oficiales online + tiendas físicas curadas y aportadas por la comunidad
          OpenStreetMap. Para la fuente oficial actualizada, el localizador Wizards Play Network
          cubre cualquier ciudad del mundo.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Tiendas online y oficiales</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {ONLINE_STORES.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold leading-tight">{s.name}</h3>
                  {s.official && (
                    <span className="chip bg-mtg-mythic/15 text-mtg-mythic shrink-0">Oficial</span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">· {s.region}</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.description}</p>
              </div>
              <span className="text-sm text-mtg-blue group-hover:underline shrink-0 self-center whitespace-nowrap">
                Visitar →
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Tiendas físicas</h2>
            <p className="text-xs text-slate-500 mt-1">
              {coords && geocoding
                ? 'Detectando tu país…'
                : coords && detectedCountry
                  ? `Tu país detectado: ${detectedCountry.name}. Cambiá el dropdown para ver otro.`
                  : queryPoint
                    ? `Buscando alrededor de ${queryPoint.label}…`
                    : 'Elegí un país o usá tu ubicación.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="input sm:w-56"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {coords ? (
              <button type="button" className="btn" onClick={clear}>
                Quitar ubicación
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={request}
                disabled={status === 'requesting'}
              >
                {status === 'requesting' ? 'Pidiendo permiso…' : 'Usar mi ubicación'}
              </button>
            )}
          </div>
        </div>

        {detectedNotInList && (
          <div className="rounded-lg border border-mtg-blue/40 bg-mtg-blue/10 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            Detectamos que estás en <strong>{detectedCountry.name}</strong>, pero aún no está en
            nuestra lista. Estamos buscando alrededor de tu ubicación de todos modos.
          </div>
        )}

        {status === 'denied' && (
          <div className="rounded-lg border border-mtg-red/40 bg-mtg-red/10 px-3 py-2 text-sm text-mtg-red">
            Rechazaste el permiso de ubicación. Activalo desde la configuración del navegador o
            seguí filtrando por país.
          </div>
        )}
        {status === 'error' && error && (
          <div className="rounded-lg border border-mtg-red/40 bg-mtg-red/10 px-3 py-2 text-sm text-mtg-red">
            No se pudo obtener tu ubicación: {error.message}
          </div>
        )}
        {osmError && (
          <div className="rounded-lg border border-mtg-red/40 bg-mtg-red/10 px-3 py-2 text-sm text-mtg-red">
            No se pudo consultar OpenStreetMap: {osmError.message}
          </div>
        )}

        {osmLoading && visibleStores.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Buscando tiendas cercanas en OpenStreetMap…
          </div>
        ) : visibleStores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-3">
            <p className="text-slate-500">
              No se encontraron tiendas físicas en{' '}
              <strong>{selectedCountry?.name || country}</strong>.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Las tiendas locales podrían existir pero no estar etiquetadas en OpenStreetMap aún.
              El localizador oficial Wizards cubre todo el mundo y se actualiza en tiempo real.
            </p>
            <a
              href="https://locator.wizards.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Abrir localizador oficial WPN →
            </a>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span>
                {visibleStores.length} {visibleStores.length === 1 ? 'tienda' : 'tiendas'}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-mtg-green" /> Curada
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-mtg-blue" /> OpenStreetMap (comunidad)
              </span>
              {osmLoading && <span className="text-slate-400">· buscando más…</span>}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
              {visibleStores.map((s) => (
                <StoreRow key={s.id} store={s} hasDistance={!!queryPoint} />
              ))}
            </div>
          </>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-4 text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">¿No ves tu tienda?</strong> Los
          datos de OpenStreetMap son aportes comunitarios y pueden estar incompletos. Para la
          fuente oficial siempre actualizada, usá el{' '}
          <a
            href="https://locator.wizards.com"
            target="_blank"
            rel="noreferrer"
            className="text-mtg-blue underline hover:no-underline"
          >
            localizador Wizards
          </a>
          .
        </div>
      </section>
    </div>
  );
}

function StoreRow({ store, hasDistance }) {
  const isOsm = store.source === 'osm';
  const cityLine = [store.city, store.countryName].filter(Boolean).join(' · ');
  const href = store.website || `https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lon}#map=18/${store.lat}/${store.lon}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold leading-tight">{store.name}</h3>
          <span
            className={`chip ${isOsm ? 'bg-mtg-blue/15 text-mtg-blue' : 'bg-mtg-green/15 text-mtg-green'}`}
            title={isOsm ? 'Dato de OpenStreetMap (aporte comunitario)' : 'Tienda verificada por nosotros'}
          >
            {isOsm ? 'OSM' : 'Curada'}
          </span>
        </div>
        {store.address && <p className="text-sm text-slate-500 mt-1">{store.address}</p>}
        {cityLine && <p className="text-sm text-slate-500">{cityLine}</p>}
        <p className="mt-1 text-xs text-mtg-blue group-hover:underline">
          {store.website ? 'Visitar sitio →' : 'Ver en mapa →'}
        </p>
      </div>
      {hasDistance && typeof store.distanceKm === 'number' && (
        <span className="chip whitespace-nowrap shrink-0 self-center">
          {store.distanceKm < 10
            ? `${store.distanceKm.toFixed(1)} km`
            : `${Math.round(store.distanceKm).toLocaleString()} km`}
        </span>
      )}
    </a>
  );
}
