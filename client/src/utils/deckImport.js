// Parsea una decklist pegada (MTGO/Moxfield/Arena/texto plano).
// Soporta: "4 Lightning Bolt", "4x Lightning Bolt", "4 Lightning Bolt (M21) 159",
// "Sol Ring" (sin cantidad → 1). Ignora líneas vacías, comentarios (// o #) y
// headers de sección (Deck / Sideboard / Commander / Maybeboard).

const SECTION_RE = /^(deck|sideboard|maybeboard|commander|companion)\s*:?\s*$/i;
// cantidad opcional + nombre (lazy) + opcional "(SET) num".
const LINE_RE = /^(?:(\d+)\s*[xX]?\s+)?(.+?)(?:\s+\(([^)]+)\)(?:\s+\S+)?)?\s*$/;

export function parseDecklist(text) {
  const result = new Map(); // nombre normalizado → { name, quantity, set }
  let ignored = 0;

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(\/\/|#)/.test(line) || SECTION_RE.test(line)) continue;

    const m = line.match(LINE_RE);
    if (!m || !m[2]?.trim()) {
      ignored++;
      continue;
    }
    const name = m[2].trim();
    const quantity = m[1] ? Math.max(1, parseInt(m[1], 10)) : 1;
    const set = m[3] ? m[3].trim().toLowerCase() : undefined;

    const key = name.toLowerCase();
    const prev = result.get(key);
    if (prev) prev.quantity += quantity;
    else result.set(key, { name, quantity, set });
  }

  return { lines: [...result.values()], ignored };
}

// Empareja las cartas resueltas por Scryfall con las cantidades pedidas.
// Devuelve { resolved: [{card, quantity}], notFound: string[] }.
export function matchResolved(lines, cards) {
  const qtyByName = new Map(lines.map((l) => [l.name.toLowerCase(), l.quantity]));
  const matched = new Set();
  const resolved = [];

  for (const card of cards) {
    const candidates = [
      card.name,
      card.card_faces?.[0]?.name,
      card.name?.split('//')[0]?.trim(),
    ]
      .filter(Boolean)
      .map((s) => s.toLowerCase());
    const key = candidates.find((c) => qtyByName.has(c) && !matched.has(c));
    if (key) {
      resolved.push({ card, quantity: qtyByName.get(key) });
      matched.add(key);
    }
  }

  const notFound = lines.filter((l) => !matched.has(l.name.toLowerCase())).map((l) => l.name);
  return { resolved, notFound };
}
