const BASE = '/api/wishlist';

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

export const wishlistApi = {
  list: (token) => request('/cards', { token }),
  add: (token, cardId, setCode) =>
    request('/cards', { method: 'POST', token, body: { cardId, setCode } }),
  remove: (token, cardId) =>
    request(`/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE', token }),
};
