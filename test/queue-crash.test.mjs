import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { TagQueue } from '../src/queue.mjs';

test('real child kill then lease recovery', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-crash-'));
  const file = path.join(dir, 'queue.json');
  const child = spawn(process.execPath, [path.join('bench', 'helpers', 'queue-crash-child.mjs'), file], { stdio: 'ignore' });
  await new Promise(resolve => child.once('exit', resolve));
  assert.equal(fs.existsSync(file), true);
  const q = new TagQueue(file, { leaseMs: 100, maxAttempts: 3 });
  assert.equal(q.pending().length, 0); // claimed, lease still alive
  await new Promise(r => setTimeout(r, 200));
  assert.equal(q.recover(), 1);
  const job = q.claim();
  assert.equal(job.sessionId, 'crash-child');
  q.ack(job.id);
  assert.equal(q.size(), 0);
});
