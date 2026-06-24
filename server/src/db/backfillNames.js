import { collectionQueries } from './database.js';

const SCRYFALL_BASE = 'https://api.scryfall.com';
const BATCH = 75; // límite de Scryfall por POST /cards/collection

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Completa user_cards.name para las filas previas a la migración (name NULL). Resuelve
// los card_ids contra Scryfall en lotes de 75. Best-effort: si falla la red (cert, etc.)
// loguea y se reintenta en el próximo boot. No bloquea el arranque del server — se llama
// fire-and-forget desde server.js después de empezar a escuchar.
export async function backfillCardNames() {
  const ids = collectionQueries.missingNameIds.all().map((r) => r.card_id);
  if (ids.length === 0) return { resolved: 0, total: 0 };

  let resolved = 0;
  for (const batch of chunk(ids, BATCH)) {
    const res = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'mtg-gallery/1.0 (+local)',
      },
      body: JSON.stringify({ identifiers: batch.map((id) => ({ id })) }),
    });
    if (!res.ok) throw new Error(`Scryfall ${res.status} al backfillear nombres`);
    const data = await res.json();
    for (const card of data.data ?? []) {
      if (card?.id && card?.name) {
        collectionQueries.setName.run(card.name, card.id);
        resolved++;
      }
    }
  }
  return { resolved, total: ids.length };
}
