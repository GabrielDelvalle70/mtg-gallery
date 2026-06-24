// Genera una decklist en texto a partir de las entradas del mazo.
// deckList: [{ quantity, card }] — card es el objeto completo de Scryfall.
// formato 'mtgo' → "4 Lightning Bolt"  ·  'arena' → "4 Lightning Bolt (M21) 159"

export const EXPORT_FORMATS = [
  { id: 'mtgo', label: 'Texto (MTGO / Moxfield)' },
  { id: 'arena', label: 'MTG Arena' },
];

function arenaName(card) {
  // Arena usa el nombre de la cara frontal para transform/mdfc/adventure,
  // pero el nombre completo "A // B" para split. Para el resto, el nombre tal cual.
  if (card.card_faces?.length && card.layout !== 'split') {
    return card.card_faces[0].name ?? card.name;
  }
  return card.name;
}

export function buildDecklist(deckList, format = 'mtgo') {
  const lines = [];
  for (const { quantity, card } of deckList) {
    if (!card || quantity <= 0) continue;
    if (format === 'arena') {
      const set = (card.set || '').toUpperCase();
      const num = card.collector_number ?? '';
      lines.push(`${quantity} ${arenaName(card)} (${set}) ${num}`.trim());
    } else {
      lines.push(`${quantity} ${card.name}`);
    }
  }
  return lines.join('\n');
}

// True si alguna entrada todavía no tiene la data de la carta cargada.
export function hasPendingCards(deckList) {
  return deckList.some((e) => e.quantity > 0 && !e.card);
}

export function decklistFilename(deckName) {
  const base = (deckName || 'mazo').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return `${base || 'mazo'}.txt`;
}

export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
