import { createClient } from '@libsql/client';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL environment variable is not set');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initialized = false;

export async function ensureDb(): Promise<void> {
  if (initialized) return;
  await db.executeMultiple(`
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

  // Migration: add skipped column to existing tables
  try {
    await db.execute('ALTER TABLE batches ADD COLUMN skipped INTEGER NOT NULL DEFAULT 0');
  } catch { /* column already exists — safe to ignore */ }

  // Seed default send-time quality settings if not yet present
  const optCheck = await db.execute({ sql: "SELECT id FROM settings WHERE key='optimal_hours' AND category='general'", args: [] });
  if (optCheck.rows.length === 0) {
    await db.execute({ sql: "INSERT INTO settings (key,value,category) VALUES ('optimal_hours','[[8,9],[10,12],[17,19]]','general')", args: [] });
  }
  const goodCheck = await db.execute({ sql: "SELECT id FROM settings WHERE key='good_hours' AND category='general'", args: [] });
  if (goodCheck.rows.length === 0) {
    await db.execute({ sql: "INSERT INTO settings (key,value,category) VALUES ('good_hours','[[9,10],[12,14],[16,17]]','general')", args: [] });
  }

  initialized = true;
}
