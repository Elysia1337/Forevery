// Durable tagging queue: append jobs, claim with a lease, ack/fail, recover after crash.
import fs from 'node:fs';
import path from 'node:path';

const now = () => Date.now();
const rid = () => 'j' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

export class TagQueue {
  constructor(file, { leaseMs = 5 * 60 * 1000, maxAttempts = 3 } = {}) {
    this.file = path.resolve(file);
    this.leaseMs = leaseMs;
    this.maxAttempts = maxAttempts;
  }
  _read() {
    const tmp = this.file + '.tmp';
    for (const p of [this.file, tmp]) {
      try {
        const o = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(o.jobs)) return o.jobs;
      } catch {}
    }
    return [];
  }
  _write(jobs) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, jobs }, null, 2) + '\n');
    fs.renameSync(tmp, this.file);
  }
  enqueue(job) {
    const jobs = this._read();
    const id = job.id || rid();
    jobs.push({ id, status: 'pending', attempts: 0, created_at: now(), ...job, id });
    this._write(jobs);
    return id;
  }
  recover() {
    const jobs = this._read();
    let n = 0;
    for (const j of jobs) {
      if (j.status === 'claimed' && (j.lease_until || 0) <= now()) {
        j.status = 'pending'; j.lease_until = 0; j.recovered_at = now(); n += 1;
      }
    }
    if (n) this._write(jobs);
    return n;
  }
  claim() {
    this.recover();
    const jobs = this._read();
    const j = jobs.find(x => x.status === 'pending');
    if (!j) return null;
    j.status = 'claimed'; j.attempts = (j.attempts || 0) + 1; j.lease_until = now() + this.leaseMs;
    this._write(jobs);
    return { ...j };
  }
  ack(id) {
    const jobs = this._read().filter(j => j.id !== id);
    this._write(jobs);
  }
  fail(id, error = '') {
    const jobs = this._read();
    const j = jobs.find(x => x.id === id);
    if (!j) return;
    j.last_error = String(error).slice(0, 500);
    if ((j.attempts || 0) >= this.maxAttempts) { j.status = 'dead'; j.dead_at = now(); }
    else { j.status = 'pending'; j.lease_until = 0; }
    this._write(jobs);
  }
  list(status) { return this._read().filter(j => !status || j.status === status); }
  pending() { return this.list('pending'); }
  dead() { return this.list('dead'); }
  size() { return this._read().length; }
}
