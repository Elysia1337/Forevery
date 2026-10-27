// Multi-session write-path replay: append -> commit -> queue -> activation.
// It measures storage/queue throughput, not recall quality.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { FileStore } from '../adapters/file-store.mjs';
import { configure } from '../src/index.mjs';
import { TagQueue } from '../src/queue.mjs';
import { ActivationPool } from '../src/activation.mjs';

const SESSIONS = Number(process.env.SESSIONS || 50);
const ROUNDS = Number(process.env.ROUNDS || 4);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-replay-'));
const store = new FileStore(root);
configure({ focusNames: ['Alice', 'Bob'], actionWords: ['hug'] });
const queue = new TagQueue(path.join(root, 'queue.json'), { leaseMs: 1000, maxAttempts: 2 });
const pool = new ActivationPool({ capacity: 50, hot: 5 });

const t0 = performance.now();
let commitMs = 0;
for (let s = 0; s < SESSIONS; s++) {
  const sessionId = 's' + s;
  const transcript = [];
  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    const a = `q${String(r * 3 + 1).padStart(3, '0')}`;
    const b = `q${String(r * 3 + 3).padStart(3, '0')}`;
    transcript.push({ id: a, role: 'user', text: `session ${s} round ${r} hello` });
    transcript.push({ id: `q${String(r * 3 + 2).padStart(3, '0')}`, role: 'ai', text: 'hi' });
    transcript.push({ id: b, role: 'user', text: 'thanks' });
    rounds.push({
      id: `R${r + 1}`, span: [a, b], title: `round ${r}`, scope: 'family',
      p_codes: ['Z000'], c_codes: ['Z000'], entities: [`s${s}`, `r${r}`],
      focus: 'Alice', participants: ['Alice', 'Bob'], scenes: ['test'], short: true,
    });
    store.append(sessionId, 'user', transcript[transcript.length - 3].text);
  }
  const c0 = performance.now();
  const res = store.commit({ sessionId, transcript, rounds, autoIndex: false, idempotencyKey: `${sessionId}-1` });
  commitMs += performance.now() - c0;
  if (!res.ok) throw new Error(JSON.stringify(res.errors));
  queue.enqueue({ sessionId });
  pool.set(sessionId, { relevance: 0.8, confidence: 0.9 });
}
const totalMs = performance.now() - t0;

const q0 = performance.now();
let claimed = 0;
for (;;) { const j = queue.claim(); if (!j) break; queue.ack(j.id); claimed++; }
const queueMs = performance.now() - q0;

const a0 = performance.now();
const hot = pool.candidates(5);
const activationMs = performance.now() - a0;

const report = {
  sessions: SESSIONS, rounds: ROUNDS, commits: SESSIONS,
  totalMs: +totalMs.toFixed(1), commitMs: +commitMs.toFixed(1),
  queueMs: +queueMs.toFixed(1), queueClaimed: claimed,
  activationMs: +activationMs.toFixed(3), hot: hot.length,
  settlements: store.listSettlements().length,
  bytes: JSON.stringify(store.listSettlements()).length,
};
console.log(JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2));
fs.rmSync(root, { recursive: true, force: true });
