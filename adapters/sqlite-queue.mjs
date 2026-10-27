// Reference SQLite queue. Requires Node 22+ (`node:sqlite`); file queue remains the portable default.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch {}

export class SqliteQueue {
  constructor(file, { leaseMs = 5 * 60 * 1000, maxAttempts = 3 } = {}) {
    if (!DatabaseSync) throw new Error('node:sqlite is unavailable; use Node 22+ or the file queue');
    this.leaseMs = leaseMs; this.maxAttempts = maxAttempts;
    this.db = new DatabaseSync(file);
    this.db.exec(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, session_id TEXT, payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, last_error TEXT
    )`);
  }
  enqueue(job) {
    const id = job.id || 'j' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    this.db.prepare('INSERT INTO jobs (id,status,session_id,payload,attempts,lease_until,created_at) VALUES (?,?,?,?,0,0,?)')
      .run(id, 'pending', job.sessionId || '', JSON.stringify(job), Date.now());
    return id;
  }
  recover() {
    const r = this.db.prepare("UPDATE jobs SET status='pending', lease_until=0 WHERE status='claimed' AND lease_until <= ?").run(Date.now());
    return Number(r.changes || 0);
  }
  claim() {
    this.recover();
    const row = this.db.prepare("SELECT * FROM jobs WHERE status='pending' ORDER BY created_at LIMIT 1").get();
    if (!row) return null;
    this.db.prepare("UPDATE jobs SET status='claimed', attempts=attempts+1, lease_until=? WHERE id=?").run(Date.now() + this.leaseMs, row.id);
    return { ...JSON.parse(row.payload), id: row.id, attempts: row.attempts + 1 };
  }
  ack(id) { this.db.prepare('DELETE FROM jobs WHERE id=?').run(id); }
  fail(id, error = '') {
    const row = this.db.prepare('SELECT attempts FROM jobs WHERE id=?').get(id);
    if (!row) return;
    if (row.attempts >= this.maxAttempts) this.db.prepare("UPDATE jobs SET status='dead', last_error=? WHERE id=?").run(String(error).slice(0, 500), id);
    else this.db.prepare("UPDATE jobs SET status='pending', lease_until=0, last_error=? WHERE id=?").run(String(error).slice(0, 500), id);
  }
  list(status) {
    const rows = status ? this.db.prepare('SELECT * FROM jobs WHERE status=?').all(status) : this.db.prepare('SELECT * FROM jobs').all();
    return rows.map(r => ({ ...JSON.parse(r.payload), id: r.id, status: r.status, attempts: r.attempts }));
  }
  size() { return Number(this.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n); }
  close() { this.db.close(); }
}
