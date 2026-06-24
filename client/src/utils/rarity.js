export const RARITY = [
  { id: 'mythic', label: 'Mítica', rank: 4, color: 'text-mtg-mythic' },
  { id: 'rare', label: 'Rara', rank: 3, color: 'text-mtg-rare' },
  { id: 'uncommon', label: 'Infrecuente', rank: 2, color: 'text-mtg-uncommon' },
  { id: 'common', label: 'Común', rank: 1, color: 'text-slate-400' },
];

export function rarityRank(id) {
  return RARITY.find((r) => r.id === id)?.rank ?? 0;
}

export function rarityLabel(id) {
  return RARITY.find((r) => r.id === id)?.label ?? id ?? '—';
}

export const ORDER_OPTIONS = [
  { id: 'released', label: 'Fecha de lanzamiento' },
  { id: 'name', label: 'Nombre (A-Z)' },
  { id: 'rarity', label: 'Rareza' },
  { id: 'set', label: 'Set' },
  { id: 'usd', label: 'Precio (USD)' },
  { id: 'edhrec', label: 'Popularidad EDH' },
];

export const TYPE_OPTIONS = [
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Planeswalker',
  'Land',
  'Battle',
];

export const LEGALITY_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'modern', label: 'Modern' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'commander', label: 'Commander' },
  { id: 'pauper', label: 'Pauper' },
];
