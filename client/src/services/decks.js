const BASE = '/api/decks';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  }
  return data;
}

export const decksApi = {
  list: (token) => request('/', { token }),
  create: (token, name, format) => request('/', { method: 'POST', token, body: { name, format } }),
  get: (token, id) => request(`/${id}`, { token }),
  update: (token, id, patch) => request(`/${id}`, { method: 'PATCH', token, body: patch }),
  remove: (token, id) => request(`/${id}`, { method: 'DELETE', token }),
  setCard: (token, id, cardId, setCode, quantity, name) =>
    request(`/${id}/cards`, { method: 'PUT', token, body: { cardId, setCode, quantity, name } }),
  import: (token, id, cards, mode) =>
    request(`/${id}/import`, { method: 'POST', token, body: { cards, mode } }),
};

// Formatos soportados (constructed). Sync con FORMATS del server (decks.js).
export const FORMATS = [
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'modern', label: 'Modern' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'pauper', label: 'Pauper' },
];

export const MIN_DECK_SIZE = 60;

export function formatLabel(id) {
  return FORMATS.find((f) => f.id === id)?.label ?? id;
}
