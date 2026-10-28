// Settlement queue: the model already tagged; workers only commit.
import path from 'node:path';
import { TagQueue } from './queue.mjs';
import { commitSettlement } from './index.mjs';

const QUEUE_FILE = process.env.MEMORY_SETTLE_QUEUE || './data/settle-queue.json';
export function settlementQueue() { return new TagQueue(QUEUE_FILE, { leaseMs: 10 * 60 * 1000, maxAttempts: 3 }); }

export function enqueueSettlement({ sessionId, transcript, rounds, options = {} }) {
  const q = settlementQueue();
  const idempotencyKey = options.idempotencyKey || `${sessionId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  const id = q.enqueue({ sessionId, transcript, rounds, options: { ...options, idempotencyKey } });
  return { id, idempotencyKey };
}

export function drainSettlementQueue({ max = 20, untilId = '' } = {}) {
  const q = settlementQueue();
  const results = [];
  for (let i = 0; i < max; i++) {
    const job = q.claim();
    if (!job) break;
    let r;
    try { r = commitSettlement({ ...job.options, sessionId: job.sessionId, transcript: job.transcript, rounds: job.rounds }); }
    catch (e) { r = { ok: false, errors: [e.message] }; }
    if (r.ok) q.ack(job.id); else q.fail(job.id, (r.errors || []).join('; '));
    results.push({ id: job.id, ok: !!r.ok, path: r.path, settlement: r.settlement, errors: r.errors });
    if (untilId && job.id === untilId) break;
  }
  return results;
}

export function queueSize() { return settlementQueue().size(); }
export function deadSettlementJobs() { return settlementQueue().dead(); }
export function queueSnapshot() { const q = settlementQueue(); return { pending: q.pending().length, dead: q.dead().length, total: q.size() }; }
