import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'sms-campaign.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

function initializeDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'va' CHECK(role IN ('admin', 'va')),
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      tz_label TEXT NOT NULL DEFAULT 'ET',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      county TEXT NOT NULL,
      state TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned', 'InProgress', 'Done')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      batch_number INTEGER NOT NULL,
      lc_batch_id TEXT DEFAULT '',
      template TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 50,
      owner_id INTEGER NOT NULL,
      local_target_time TEXT NOT NULL,
      actual_send_time TEXT,
      conversion_rate REAL,
      reply_count REAL,
      planned_date TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('county', 'state', 'template', 'general'))
    );
  `);
}

export default getDb;
