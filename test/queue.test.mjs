import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TagQueue } from '../src/queue.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-queue-'));
const file = path.join(dir, 'queue.json');

test('enqueue / claim / ack', () => {
  const q = new TagQueue(file, { leaseMs: 1000, maxAttempts: 2 });
  const id = q.enqueue({ sessionId: 's1' });
  const job = q.claim();
  assert.equal(job.id, id);
  q.ack(id);
  assert.equal(q.size(), 0);
});

test('recover expired claim after crash', () => {
  const q = new TagQueue(file, { leaseMs: 10, maxAttempts: 2 });
  const id = q.enqueue({ sessionId: 's2' });
  q.claim();
  const later = new TagQueue(file, { leaseMs: 10, maxAttempts: 2 });
  // force lease expiry without sleeping
  const jobs = JSON.parse(fs.readFileSync(file, 'utf8'));
  jobs.jobs.find(j => j.id === id).lease_until = Date.now() - 1;
  fs.writeFileSync(file, JSON.stringify(jobs));
  assert.equal(later.recover(), 1);
  assert.equal(later.claim().id, id);
});

test('fail becomes dead after max attempts', () => {
  const q = new TagQueue(file, { leaseMs: 1000, maxAttempts: 1 });
  const id = q.enqueue({ sessionId: 's3' });
  q.claim();
  q.fail(id, 'boom');
  assert.equal(q.dead().length, 1);
});

test('corrupt main file falls back to tmp', () => {
  const f2 = path.join(dir, 'q2.json');
  fs.writeFileSync(f2, '{"jobs":[');
  fs.writeFileSync(f2 + '.tmp', JSON.stringify({ version: 1, jobs: [{ id: 'x', status: 'pending', attempts: 0 }] }));
  const q = new TagQueue(f2);
  assert.equal(q.pending().length, 1);
});
