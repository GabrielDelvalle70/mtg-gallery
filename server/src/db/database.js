import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '../../../data');
const DB_PATH = path.join(DB_DIR, 'app.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_cards (
    user_id    INTEGER NOT NULL,
    card_id    TEXT NOT NULL,
    set_code   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, card_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_cards_set ON user_cards(user_id, set_code);

  CREATE TABLE IF NOT EXISTS user_wishlist (
    user_id    INTEGER NOT NULL,
    card_id    TEXT NOT NULL,
    set_code   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, card_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS decks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT NOT NULL,
    format     TEXT NOT NULL DEFAULT 'standard',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deck_cards (
    deck_id   INTEGER NOT NULL,
    card_id   TEXT NOT NULL,
    set_code  TEXT NOT NULL,
    quantity  INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (deck_id, card_id),
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id, updated_at);
`);

// Migración: nombre de carta en user_cards. Se usa para validar "tengo esta carta"
// por nombre al armar mazos (cualquier impresión cuenta). No hay framework de
// migraciones; chequeamos la columna a mano. Filas viejas quedan con name NULL y
// se completan con el backfill al boot (ver backfillCardNames). COLLATE NOCASE en
// las queries para que el match sea case-insensitive.
if (!db.prepare('PRAGMA table_info(user_cards)').all().some((c) => c.name === 'name')) {
  db.exec('ALTER TABLE user_cards ADD COLUMN name TEXT');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_user_cards_name ON user_cards(user_id, name)');

export default db;

export const userQueries = {
  findByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?'),
  insert: db.prepare(
    'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?) RETURNING id, email, username, created_at',
  ),
};

export const collectionQueries = {
  listIds: db.prepare('SELECT card_id, set_code, name FROM user_cards WHERE user_id = ?'),
  add: db.prepare(
    'INSERT OR IGNORE INTO user_cards (user_id, card_id, set_code, name) VALUES (?, ?, ?, ?)',
  ),
  remove: db.prepare('DELETE FROM user_cards WHERE user_id = ? AND card_id = ?'),
  countsBySet: db.prepare(
    'SELECT set_code, COUNT(*) as count FROM user_cards WHERE user_id = ? GROUP BY set_code',
  ),
  // ¿El usuario posee alguna impresión de una carta con este nombre? (match por nombre,
  // case-insensitive). Devuelve la fila o undefined.
  ownsName: db.prepare(
    'SELECT 1 FROM user_cards WHERE user_id = ? AND name = ? COLLATE NOCASE LIMIT 1',
  ),
  // Backfill: card_ids sin nombre (filas previas a la migración).
  missingNameIds: db.prepare(
    "SELECT DISTINCT card_id FROM user_cards WHERE name IS NULL OR name = ''",
  ),
  // Backfill: completa el nombre de todas las filas (cualquier usuario) con ese card_id.
  setName: db.prepare(
    "UPDATE user_cards SET name = ? WHERE card_id = ? AND (name IS NULL OR name = '')",
  ),
};

export const wishlistQueries = {
  listIds: db.prepare('SELECT card_id, set_code FROM user_wishlist WHERE user_id = ?'),
  add: db.prepare(
    'INSERT OR IGNORE INTO user_wishlist (user_id, card_id, set_code) VALUES (?, ?, ?)',
  ),
  remove: db.prepare('DELETE FROM user_wishlist WHERE user_id = ? AND card_id = ?'),
};

// Adquirir una carta = agregarla a la colección y, si estaba en la wishlist, sacarla.
// Atómico para que ambas operaciones queden consistentes (decisión de UX: al conseguir
// la carta deja de ser un deseo). El cliente refleja esto con wishlist.dropLocal().
export const acquireCard = db.transaction((userId, cardId, setCode, name) => {
  collectionQueries.add.run(userId, cardId, setCode, name || null);
  wishlistQueries.remove.run(userId, cardId);
});

export const deckQueries = {
  create: db.prepare(
    'INSERT INTO decks (user_id, name, format) VALUES (?, ?, ?) RETURNING id, name, format, created_at, updated_at',
  ),
  // Lista con conteo total de cartas (suma de cantidades).
  listForUser: db.prepare(`
    SELECT d.id, d.name, d.format, d.created_at, d.updated_at,
           COALESCE(SUM(dc.quantity), 0) AS card_count
    FROM decks d
    LEFT JOIN deck_cards dc ON dc.deck_id = d.id
    WHERE d.user_id = ?
    GROUP BY d.id
    ORDER BY d.updated_at DESC
  `),
  // Trae el deck sólo si pertenece al usuario (chequeo de ownership).
  getOwned: db.prepare('SELECT id, name, format, created_at, updated_at FROM decks WHERE id = ? AND user_id = ?'),
  listCards: db.prepare('SELECT card_id, set_code, quantity FROM deck_cards WHERE deck_id = ?'),
  cardQty: db.prepare('SELECT quantity FROM deck_cards WHERE deck_id = ? AND card_id = ?'),
  updateMeta: db.prepare(
    "UPDATE decks SET name = ?, format = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
  ),
  touch: db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?"),
  remove: db.prepare('DELETE FROM decks WHERE id = ? AND user_id = ?'),
  upsertCard: db.prepare(`
    INSERT INTO deck_cards (deck_id, card_id, set_code, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(deck_id, card_id) DO UPDATE SET quantity = excluded.quantity, set_code = excluded.set_code
  `),
  // Suma a la cantidad existente (para import en modo "agregar"), clamp a 99.
  addCard: db.prepare(`
    INSERT INTO deck_cards (deck_id, card_id, set_code, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(deck_id, card_id) DO UPDATE SET quantity = MIN(99, deck_cards.quantity + excluded.quantity), set_code = excluded.set_code
  `),
  removeCard: db.prepare('DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?'),
  clear: db.prepare('DELETE FROM deck_cards WHERE deck_id = ?'),
};

// Importa varias cartas en una transacción. mode 'replace' vacía el mazo primero y
// setea cantidades; 'add' suma a lo existente. Asume ownership ya verificada.
export const importDeck = db.transaction((deckId, cards, mode) => {
  if (mode === 'replace') deckQueries.clear.run(deckId);
  const stmt = mode === 'add' ? deckQueries.addCard : deckQueries.upsertCard;
  for (const c of cards) stmt.run(deckId, c.cardId, c.setCode, c.quantity);
  deckQueries.touch.run(deckId);
});

// Setea la cantidad de una carta en un mazo (0 = quitarla) y actualiza updated_at,
// todo en una transacción. Asume que la propiedad del mazo ya fue verificada.
export const setDeckCard = db.transaction((deckId, cardId, setCode, quantity) => {
  if (quantity > 0) deckQueries.upsertCard.run(deckId, cardId, setCode, quantity);
  else deckQueries.removeCard.run(deckId, cardId);
  deckQueries.touch.run(deckId);
});
