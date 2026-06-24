export const COLORS = [
  { id: 'W', label: 'Blanco', hex: '#F8F6E3' },
  { id: 'U', label: 'Azul', hex: '#0E68AB' },
  { id: 'B', label: 'Negro', hex: '#150B00' },
  { id: 'R', label: 'Rojo', hex: '#D3202A' },
  { id: 'G', label: 'Verde', hex: '#00733E' },
];

export function colorIdentityLabel(ids = []) {
  if (!ids.length) return 'Incoloro';
  return ids
    .map((id) => COLORS.find((c) => c.id === id)?.label ?? id)
    .join(' / ');
}
