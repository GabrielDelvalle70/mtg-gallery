// Propiedad de cartas "por nombre": todas las impresiones de una carta comparten el
// mismo `card.name` en Scryfall, así que la clave de propiedad es el nombre normalizado
// (minúsculas + trim). Si tenés cualquier impresión de "Lightning Bolt", podés agregar
// cualquier impresión de "Lightning Bolt" a un mazo. Ver CLAUDE.md (regla de mazos).

export function nameKey(name) {
  return String(name || '').trim().toLowerCase();
}

// ¿El set de nombres poseídos (claves ya normalizadas) incluye a esta carta?
export function ownsCard(card, ownedNames) {
  if (!card || !ownedNames) return false;
  return ownedNames.has(nameKey(card.name));
}
