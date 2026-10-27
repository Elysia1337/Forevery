import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let hasSqlite = true;
try { require('node:sqlite'); } catch { hasSqlite = false; }

test('sqlite queue (skipped when unavailable)', { skip: !hasSqlite }, async () => {
  const { SqliteQueue } = await import('../adapters/sqlite-queue.mjs');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-sqlite-')), 'q.db');
  const q = new SqliteQueue(file, { leaseMs: 10, maxAttempts: 1 });
  const id = q.enqueue({ sessionId: 's1' });
  assert.equal(q.claim().id, id);
  q.fail(id, 'boom');
  assert.equal(q.list('dead').length, 1);
  q.close();
});
