import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userQueries } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function publicUser(row) {
  return { id: row.id, email: row.email, username: row.username, createdAt: row.created_at };
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username y password son requeridos' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email inválido' });
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username: 3-24 caracteres alfanuméricos o _' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (userQueries.findByEmail.get(email)) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }
    if (userQueries.findByUsername.get(username)) {
      return res.status(409).json({ error: 'Ese username ya está en uso' });
    }

    const hash = await bcrypt.hash(password, 12);
    const created = userQueries.insert.get(email, username, hash);
    const token = signToken(created);
    res.status(201).json({ token, user: publicUser(created) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier y password son requeridos' });
    }
    const row =
      userQueries.findByEmail.get(identifier) || userQueries.findByUsername.get(identifier);
    if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(row);
    res.json({ token, user: publicUser(row) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  const row = userQueries.findById.get(req.user.sub);
  if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: publicUser(row) });
});

export default router;
