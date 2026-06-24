const BASE = '/api/auth';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  }
  return data;
}

export const authApi = {
  register: ({ email, username, password }) =>
    request('/register', { method: 'POST', body: { email, username, password } }),
  login: ({ identifier, password }) =>
    request('/login', { method: 'POST', body: { identifier, password } }),
  me: (token) => request('/me', { token }),
};
