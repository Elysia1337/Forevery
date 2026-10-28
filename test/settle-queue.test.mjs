import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configure } from '../src/index.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-settle-queue-'));
process.env.MEMORY_SETTLE_QUEUE = path.join(root, 'queue.json');
configure({ rawDir: path.join(root, 'raw'), settlementsDir: path.join(root, 'set'), recentDir: path.join(root, 'recent'), focusNames: ['Alice', 'Bob'] });

const transcript = [
  { id: 'q001', role: 'user', text: 'hello' },
  { id: 'q002', role: 'ai', text: 'hi' },
  { id: 'q003', role: 'user', text: 'thanks' },
  { id: 'q004', role: 'ai', text: 'ok' },
];
const rounds = [
  { id: 'R01', span: ['q001', 'q002'], title: 'a', scope: 'family', short: true, skipped: true, reason: 'none' },
  { id: 'R02', span: ['q003', 'q004'], title: 'b', scope: 'family', short: true, p_codes: ['Z000'], c_codes: ['Z000'], entities: ['a', 'b'], focus: 'Alice', participants: ['Alice', 'Bob'], scenes: ['test'] },
];

test('enqueue then drain commits', async () => {
  const { enqueueSettlement, drainSettlementQueue, queueSize } = await import('../src/settle-queue.mjs');
  const { id } = enqueueSettlement({ sessionId: 's1', transcript, rounds, options: { autoIndex: false } });
  assert.equal(queueSize(), 1);
  const out = drainSettlementQueue({ max: 2, untilId: id });
  assert.equal(out[0].ok, true);
  assert.equal(queueSize(), 0);
});
