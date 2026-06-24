import { Router } from 'express';
import { collectionQueries, acquireCard } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/cards', (req, res) => {
  const rows = collectionQueries.listIds.all(req.user.sub);
  res.json({ cards: rows.map((r) => ({ id: r.card_id, setCode: r.set_code, name: r.name })) });
});

router.post('/cards', (req, res) => {
  const { cardId, setCode, name } = req.body || {};
  if (!cardId || !setCode) {
    return res.status(400).json({ error: 'cardId y setCode son requeridos' });
  }
  // El nombre se guarda para validar propiedad por nombre al armar mazos. Es opcional
  // (clientes viejos) — si falta, el backfill al boot lo completa.
  const cardName = typeof name === 'string' ? name.trim().slice(0, 200) : null;
  // Agrega a la colección y quita de la wishlist (si estaba) en una transacción.
  acquireCard(req.user.sub, String(cardId), String(setCode).toLowerCase(), cardName);
  res.status(201).json({ ok: true });
});

router.delete('/cards/:cardId', (req, res) => {
  collectionQueries.remove.run(req.user.sub, req.params.cardId);
  res.status(204).end();
});

router.get('/stats', (req, res) => {
  const rows = collectionQueries.countsBySet.all(req.user.sub);
  const bySet = {};
  let total = 0;
  for (const row of rows) {
    bySet[row.set_code] = row.count;
    total += row.count;
  }
  res.json({ total, bySet });
});

export default router;
