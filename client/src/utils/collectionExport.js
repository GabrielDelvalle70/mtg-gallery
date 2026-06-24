// Exporta la colección a CSV o JSON. Recibe los objetos completos de Scryfall
// (resueltos con fetchCardsByIds) y genera un archivo autocontenido —cada fila
// incluye scryfall_uri, así el export sirve sin la app.

export const COLLECTION_EXPORT_FORMATS = [
  { id: 'csv', label: 'CSV (planilla)' },
  { id: 'json', label: 'JSON' },
];

// Toma un campo de la cara frontal cuando la carta es de doble cara (DFC/MDFC).
function front(card, key) {
  return card[key] ?? card.card_faces?.[0]?.[key] ?? '';
}

// Aplana una carta de Scryfall a un registro de export estable.
export function toExportRow(card) {
  return {
    name: card.name ?? '',
    set: (card.set ?? '').toUpperCase(),
    set_name: card.set_name ?? '',
    collector_number: card.collector_number ?? '',
    rarity: card.rarity ?? '',
    mana_cost: front(card, 'mana_cost'),
    cmc: typeof card.cmc === 'number' ? card.cmc : '',
    colors: (card.colors ?? card.card_faces?.[0]?.colors ?? []).join(''),
    type_line: front(card, 'type_line'),
    price_usd: card.prices?.usd ?? '',
    scryfall_id: card.id ?? '',
    scryfall_uri: card.scryfall_uri ?? '',
  };
}

const COLUMNS = [
  'name',
  'set',
  'set_name',
  'collector_number',
  'rarity',
  'mana_cost',
  'cmc',
  'colors',
  'type_line',
  'price_usd',
  'scryfall_id',
  'scryfall_uri',
];

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Orden estable: por nombre, luego por set, luego por número de colección.
function sortRows(rows) {
  return [...rows].sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.set.localeCompare(b.set) ||
      String(a.collector_number).localeCompare(String(b.collector_number), undefined, {
        numeric: true,
      }),
  );
}

export function buildCollectionCsv(cards) {
  const rows = sortRows(cards.map(toExportRow));
  const lines = [COLUMNS.join(',')];
  for (const row of rows) lines.push(COLUMNS.map((c) => csvCell(row[c])).join(','));
  return lines.join('\n');
}

export function buildCollectionJson(cards) {
  const rows = sortRows(cards.map(toExportRow));
  return JSON.stringify(rows, null, 2);
}

export function buildCollectionExport(cards, format = 'csv') {
  return format === 'json' ? buildCollectionJson(cards) : buildCollectionCsv(cards);
}

export function collectionExportFilename(format = 'csv') {
  return `mi-coleccion-mtg.${format === 'json' ? 'json' : 'csv'}`;
}

export function collectionExportMime(format = 'csv') {
  return format === 'json' ? 'application/json' : 'text/csv';
}
