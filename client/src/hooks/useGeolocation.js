import { useCallback, useState } from 'react';

export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError(new Error('Tu navegador no soporta geolocalización.'));
      return;
    }
    setStatus('requesting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('granted');
      },
      (err) => {
        setError(err);
        setStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { coords, status, error, request, clear };
}
