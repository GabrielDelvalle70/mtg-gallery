import { Router } from 'express';
import { wishlistQueries } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/cards', (req, res) => {
  const rows = wishlistQueries.listIds.all(req.user.sub);
  res.json({ cards: rows.map((r) => ({ id: r.card_id, setCode: r.set_code })) });
});

router.post('/cards', (req, res) => {
  const { cardId, setCode } = req.body || {};
  if (!cardId || !setCode) {
    return res.status(400).json({ error: 'cardId y setCode son requeridos' });
  }
  wishlistQueries.add.run(req.user.sub, String(cardId), String(setCode).toLowerCase());
  res.status(201).json({ ok: true });
});

router.delete('/cards/:cardId', (req, res) => {
  wishlistQueries.remove.run(req.user.sub, req.params.cardId);
  res.status(204).end();
});

export default router;
