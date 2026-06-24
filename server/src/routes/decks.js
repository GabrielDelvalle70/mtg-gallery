import { Router } from 'express';
import { deckQueries, setDeckCard, importDeck, collectionQueries } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Formatos soportados (constructed). Mantener en sync con FORMATS del cliente.
const FORMATS = new Set(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper']);
const MAX_QTY = 99;

function cleanName(name) {
  return typeof name === 'string' ? name.trim().slice(0, 80) : '';
}

// ¿El usuario posee alguna impresión de una carta con este nombre? Solo se puede
// agregar al mazo lo que está en la colección (match por nombre, cualquier impresión).
// El nombre lo provee el cliente; la autoridad es el contenido de user_cards (no se
// puede afirmar propiedad de un nombre que no está en la colección). Ver CLAUDE.md.
function ownsCardName(userId, name) {
  const n = typeof name === 'string' ? name.trim() : '';
  return !!n && !!collectionQueries.ownsName.get(userId, n);
}

router.get('/', (req, res) => {
  const rows = deckQueries.listForUser.all(req.user.sub);
  res.json({
    decks: rows.map((d) => ({
      id: d.id,
      name: d.name,
      format: d.format,
      cardCount: d.card_count,
      updatedAt: d.updated_at,
    })),
  });
});

router.post('/', (req, res) => {
  const name = cleanName(req.body?.name);
  const format = String(req.body?.format || 'standard').toLowerCase();
  if (!name) return res.status(400).json({ error: 'El nombre del mazo es requerido' });
  if (!FORMATS.has(format)) return res.status(400).json({ error: 'Formato inválido' });
  const deck = deckQueries.create.get(req.user.sub, name, format);
  res.status(201).json({ deck: { ...deck, cards: [] } });
});

router.get('/:id', (req, res) => {
  const deck = deckQueries.getOwned.get(req.params.id, req.user.sub);
  if (!deck) return res.status(404).json({ error: 'Mazo no encontrado' });
  const cards = deckQueries.listCards
    .all(deck.id)
    .map((c) => ({ id: c.card_id, setCode: c.set_code, quantity: c.quantity }));
  res.json({ deck: { ...deck, cards } });
});

router.patch('/:id', (req, res) => {
  const deck = deckQueries.getOwned.get(req.params.id, req.user.sub);
  if (!deck) return res.status(404).json({ error: 'Mazo no encontrado' });
  const name = req.body?.name !== undefined ? cleanName(req.body.name) : deck.name;
  const format =
    req.body?.format !== undefined ? String(req.body.format).toLowerCase() : deck.format;
  if (!name) return res.status(400).json({ error: 'El nombre del mazo es requerido' });
  if (!FORMATS.has(format)) return res.status(400).json({ error: 'Formato inválido' });
  deckQueries.updateMeta.run(name, format, deck.id, req.user.sub);
  res.json({ deck: { ...deck, name, format } });
});

router.delete('/:id', (req, res) => {
  deckQueries.remove.run(req.params.id, req.user.sub);
  res.status(204).end();
});

// Setea la cantidad de una carta (0 = quitarla). Idempotente.
router.put('/:id/cards', (req, res) => {
  const deck = deckQueries.getOwned.get(req.params.id, req.user.sub);
  if (!deck) return res.status(404).json({ error: 'Mazo no encontrado' });
  const { cardId, setCode, name } = req.body || {};
  let quantity = Number(req.body?.quantity);
  if (!cardId || !setCode) {
    return res.status(400).json({ error: 'cardId y setCode son requeridos' });
  }
  if (!Number.isFinite(quantity)) return res.status(400).json({ error: 'quantity inválido' });
  quantity = Math.max(0, Math.min(MAX_QTY, Math.floor(quantity)));
  // Solo se valida propiedad al AUMENTAR la cantidad. Reducir o quitar siempre se
  // permite (así un mazo viejo con cartas que ya no tenés se puede limpiar).
  const current = deckQueries.cardQty.get(deck.id, String(cardId))?.quantity || 0;
  if (quantity > current && !ownsCardName(req.user.sub, name)) {
    return res.status(403).json({ error: 'No tenés esta carta en tu colección.' });
  }
  setDeckCard(deck.id, String(cardId), String(setCode).toLowerCase(), quantity);
  res.json({ ok: true, quantity });
});

// Import bulk: { cards: [{cardId, setCode, quantity, name}], mode: 'add' | 'replace' }
// Solo se importan las cartas que el usuario posee (match por nombre); las demás se
// saltean y se reportan en `skipped`.
router.post('/:id/import', (req, res) => {
  const deck = deckQueries.getOwned.get(req.params.id, req.user.sub);
  if (!deck) return res.status(404).json({ error: 'Mazo no encontrado' });
  const mode = req.body?.mode === 'replace' ? 'replace' : 'add';
  const raw = Array.isArray(req.body?.cards) ? req.body.cards : null;
  if (!raw || raw.length === 0) return res.status(400).json({ error: 'cards (array no vacío) es requerido' });
  if (raw.length > 1000) return res.status(400).json({ error: 'demasiadas cartas (máx 1000)' });

  const cards = [];
  let malformed = 0;
  let skippedNotOwned = 0;
  for (const c of raw) {
    const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(c?.quantity))));
    if (!c?.cardId || !c?.setCode || !Number.isFinite(qty)) {
      malformed++;
      continue;
    }
    if (!ownsCardName(req.user.sub, c?.name)) {
      skippedNotOwned++;
      continue;
    }
    cards.push({ cardId: String(c.cardId), setCode: String(c.setCode).toLowerCase(), quantity: qty });
  }
  // Solo es 400 si nada vino bien formado; si todo se salteó por no poseído es válido (0 importadas).
  if (cards.length === 0 && skippedNotOwned === 0) {
    return res.status(400).json({ error: 'ninguna carta válida' });
  }
  // Evita vaciar el mazo en modo replace si no hay nada poseído para poner.
  if (cards.length > 0) importDeck(deck.id, cards, mode);
  res.json({ ok: true, imported: cards.length, skipped: skippedNotOwned, mode });
});

export default router;
