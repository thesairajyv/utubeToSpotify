const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.sqlite');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  provider TEXT,
  token TEXT,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  sourcePlaylistId TEXT,
  targetPlatform TEXT,
  targetUserId TEXT,
  status TEXT,
  songsTotal INTEGER DEFAULT 0,
  songsTransferred INTEGER DEFAULT 0,
  createdAt INTEGER,
  completedAt INTEGER,
  error TEXT
);
`);

function createUser(userId) {
  const stmt = db.prepare('INSERT OR IGNORE INTO users (id, createdAt) VALUES (?, ?)');
  stmt.run(userId, Date.now());
}

function saveToken(userId, provider, tokenJson) {
  const stmt = db.prepare('INSERT INTO tokens (userId, provider, token, createdAt) VALUES (?, ?, ?, ?)');
  stmt.run(userId, provider, tokenJson, Date.now());
}

function getLatestToken(userId, provider) {
  const stmt = db.prepare('SELECT token FROM tokens WHERE userId = ? AND provider = ? ORDER BY id DESC LIMIT 1');
  const row = stmt.get(userId, provider);
  return row ? JSON.parse(row.token) : null;
}

function createJob(job) {
  const stmt = db.prepare('INSERT INTO jobs (id, userId, sourcePlaylistId, targetPlatform, targetUserId, status, songsTotal, songsTransferred, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(job.id, job.userId, job.sourcePlaylistId, job.targetPlatform, job.targetUserId, job.status || 'pending', job.songsTotal || 0, job.songsTransferred || 0, Date.now());
}

function updateJobProgress(id, songsTransferred) {
  const stmt = db.prepare('UPDATE jobs SET songsTransferred = ? WHERE id = ?');
  stmt.run(songsTransferred, id);
}

function setJobStatus(id, status, error) {
  const stmt = db.prepare('UPDATE jobs SET status = ?, completedAt = CASE WHEN ? IN ("completed","failed") THEN ? ELSE NULL END, error = ? WHERE id = ?');
  const now = Date.now();
  stmt.run(status, status, now, error || null, id);
}

function getJob(id) {
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  return stmt.get(id);
}

module.exports = { createUser, saveToken, getLatestToken, createJob, updateJobProgress, setJobStatus, getJob };
