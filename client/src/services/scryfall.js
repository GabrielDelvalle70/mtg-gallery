const BASE = '/api/scryfall';

export function buildScryfallQuery({ query, rarity, set, year, colors, type, legality }) {
  const parts = [];
  if (query?.trim()) parts.push(query.trim());
  if (rarity) parts.push(`r:${rarity}`);
  if (set) parts.push(`set:${set}`);
  if (year) parts.push(`year:${year}`);
  if (type) parts.push(`type:${type}`);
  if (legality) parts.push(`legal:${legality}`);
  if (colors?.length) {
    parts.push(`c:${colors.join('').toLowerCase()}`);
  }
  if (parts.length === 0) parts.push('game:paper');
  return parts.join(' ');
}

export function searchUrl({ q, order = 'released', dir = 'desc', page = 1, unique = 'cards' }) {
  const params = new URLSearchParams({ q, order, dir, page: String(page), unique });
  return `${BASE}/search?${params.toString()}`;
}

export function cardByIdUrl(id) {
  return `${BASE}/cards/${encodeURIComponent(id)}`;
}

export function setsUrl() {
  return `${BASE}/sets`;
}

export function catalogUrl(name) {
  return `${BASE}/catalog/${encodeURIComponent(name)}`;
}

export const SCRYFALL_PAGE_SIZE = 175;

// Scryfall acepta máximo 75 identifiers por POST /cards/collection.
const COLLECTION_BATCH = 75;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Resuelve identifiers de Scryfall (por {id}, {name}, {name,set}, etc.) batcheando
 * en grupos de 75 vía POST /cards/collection.
 * @param {object[]} identifiers - ej. [{id}], [{name}], [{name, set}]
 * @param {object} opts
 * @param {AbortSignal} [opts.signal]
 * @param {(done:number, total:number) => void} [opts.onProgress]
 * @returns {Promise<{cards: object[], notFound: object[]}>} notFound = identifiers no resueltos
 */
export async function fetchCardCollection(identifiers, { signal, onProgress } = {}) {
  const batches = chunk(identifiers, COLLECTION_BATCH);
  const cards = [];
  const notFound = [];
  for (const batch of batches) {
    const res = await fetch(`${BASE}/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch }),
      signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
    }
    if (Array.isArray(data.data)) cards.push(...data.data);
    if (Array.isArray(data.not_found)) notFound.push(...data.not_found);
    onProgress?.(cards.length + notFound.length, identifiers.length);
  }
  return { cards, notFound };
}

/**
 * Trae la data completa de un set de IDs de cartas. Wrapper de fetchCardCollection.
 * @returns {Promise<{cards: object[], notFound: number}>}
 */
export async function fetchCardsByIds(ids, opts = {}) {
  const { cards, notFound } = await fetchCardCollection(
    ids.map((id) => ({ id })),
    opts,
  );
  return { cards, notFound: notFound.length };
}
