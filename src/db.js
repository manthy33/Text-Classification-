const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    technician_id INTEGER NOT NULL REFERENCES users(id),
    assigned_to TEXT NOT NULL,
    notes TEXT,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    returned_at TEXT,
    return_notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_assignments_equipment ON assignments(equipment_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_technician ON assignments(technician_id);
`);

module.exports = db;
