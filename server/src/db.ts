import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(import.meta.dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'tallyo.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id                INTEGER PRIMARY KEY,
    number            TEXT NOT NULL UNIQUE,
    customer_id       INTEGER NOT NULL REFERENCES customers(id),
    amount_cents      INTEGER NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'USD',
    issued_at         TEXT NOT NULL,
    due_at            TEXT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('open', 'promised', 'disputed', 'paid')),
    paid_at           TEXT,
    paid_via          TEXT CHECK (paid_via IN ('paypal', 'manual')),
    promised_date     TEXT,
    paypal_invoice_id TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id             INTEGER PRIMARY KEY,
    invoice_id     INTEGER NOT NULL REFERENCES invoices(id),
    paypal_txn_id  TEXT NOT NULL,
    amount_cents   INTEGER NOT NULL,
    paid_at        TEXT NOT NULL,
    payer_email    TEXT
  );

  CREATE TABLE IF NOT EXISTS replies (
    id            INTEGER PRIMARY KEY,
    invoice_id    INTEGER NOT NULL REFERENCES invoices(id),
    received_at   TEXT NOT NULL,
    body          TEXT NOT NULL,
    intent        TEXT,
    promised_date TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    at         TEXT NOT NULL,
    kind       TEXT NOT NULL,
    detail     TEXT
  );
`);

// databases created before these columns existed
function addColumn(table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
addColumn('invoices', 'paypal_pay_url', 'TEXT');
addColumn('replies', 'summary', 'TEXT');
addColumn('replies', 'action_taken', 'TEXT');
addColumn('replies', 'draft_reply', 'TEXT');
