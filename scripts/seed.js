const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'sms-campaign.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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

// Seed users
const mattHash = bcrypt.hashSync('dealflow2024', 10);
const vaHash = bcrypt.hashSync('va2024', 10);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, display_name, role, timezone, tz_label)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertUser.run('matt', mattHash, 'Matt', 'admin', 'Asia/Jerusalem', 'IDT');
insertUser.run('hamna', vaHash, 'Hamna', 'va', 'Asia/Karachi', 'PKT');

// Seed settings - counties (key=county name, value=state abbreviation)
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value, category) VALUES (?, ?, ?)');
const counties = [
  { county: 'Putnam', state: 'FL' }, { county: 'Marion', state: 'FL' },
  { county: 'Levy', state: 'FL' }, { county: 'Gilchrist', state: 'FL' },
  { county: 'Suwannee', state: 'FL' }, { county: 'Columbia', state: 'FL' },
  { county: 'Bradford', state: 'FL' }, { county: 'Union', state: 'FL' },
  { county: 'Baker', state: 'FL' }, { county: 'Nassau', state: 'FL' },
  { county: 'Highlands', state: 'FL' }, { county: 'Izard', state: 'AR' },
  { county: 'Washington', state: 'AR' },
];
counties.forEach(c => insertSetting.run(c.county, c.state, 'county'));

// Seed settings - states
const states = ['FL', 'TX', 'GA', 'NC', 'SC', 'AL', 'TN', 'OH', 'PA', 'NY', 'AR'];
states.forEach(s => insertSetting.run(s, s, 'state'));

// Seed settings - templates
const templates = ['NewLandWS_Template_1', 'NewLandWS_Template_2', 'AI_Direct_Purchase'];
templates.forEach(t => insertSetting.run(t, t, 'template'));

// Seed a sample campaign
const campaign = db.prepare(`
  INSERT OR IGNORE INTO campaigns (name, county, state, status) VALUES (?, ?, ?, ?)
`).run('Putnam_FL', 'Putnam', 'FL', 'InProgress');

if (campaign.changes > 0) {
  const campaignId = campaign.lastInsertRowid;
  const matt = db.prepare('SELECT id FROM users WHERE username = ?').get('matt');
  const hamna = db.prepare('SELECT id FROM users WHERE username = ?').get('hamna');

  const insertBatch = db.prepare(`
    INSERT INTO batches (campaign_id, batch_number, lc_batch_id, template, message_count, owner_id, local_target_time, actual_send_time, conversion_rate, reply_count, planned_date, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sample batches with performance data
  insertBatch.run(campaignId, 1, 'LC-001', 'NewLandWS_Template_1', 100, matt.id, '08:30', '08:32', 4.2, 4, '2026-03-09', 0);
  insertBatch.run(campaignId, 2, 'LC-002', 'NewLandWS_Template_2', 150, hamna.id, '10:30', '10:35', 3.8, 6, '2026-03-09', 1);
  insertBatch.run(campaignId, 3, 'LC-003', 'NewLandWS_Template_1', 100, matt.id, '17:00', '17:05', 5.1, 5, '2026-03-10', 0);
  insertBatch.run(campaignId, 4, 'LC-004', 'AI_Direct_Purchase', 50, hamna.id, '11:00', '11:02', 6.0, 3, '2026-03-10', 1);
  insertBatch.run(campaignId, 5, 'LC-005', 'NewLandWS_Template_1', 100, matt.id, '08:00', null, null, null, '2026-03-16', 0);
  insertBatch.run(campaignId, 6, 'LC-006', 'NewLandWS_Template_2', 150, hamna.id, '10:00', null, null, null, '2026-03-17', 0);
}

console.log('Database seeded successfully!');
console.log('Default users:');
console.log('  matt / dealflow2024 (admin)');
console.log('  hamna / va2024 (va)');
db.close();
