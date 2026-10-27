// Minimal health check for the file-backed setup.
import fs from 'node:fs';
import path from 'node:path';
import { listPending } from './index.mjs';
import { TagQueue } from './queue.mjs';

export function checkHealth(root) {
  const dirs = {
    raw: path.join(root, 'raw'),
    settlements: path.join(root, 'settlements'),
    recent: path.join(root, 'recent'),
  };
  const checks = [];
  for (const [name, dir] of Object.entries(dirs)) {
    const exists = fs.existsSync(dir);
    let writable = false;
    try { fs.accessSync(dir, fs.constants.W_OK); writable = true; } catch {}
    checks.push({ name, ok: !exists || writable, detail: exists ? (writable ? 'writable' : 'not writable') : 'missing (created on first write)' });
  }
  let pending = 0;
  try { pending = listPending().length; } catch {}
  checks.push({ name: 'pending', ok: true, detail: String(pending) });
  let dead = 0;
  try { dead = new TagQueue(path.join(root, 'queue.json')).dead().length; } catch {}
  checks.push({ name: 'dead_jobs', ok: dead === 0, detail: String(dead) });
  return { ok: checks.every(c => c.ok), checks };
}
