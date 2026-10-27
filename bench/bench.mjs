// Minimal benchmark: append + state + candidates. No model, no network.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { configure, appendRaw, readState } from '../src/index.mjs';
import { ActivationPool } from '../src/activation.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-bench-'));
configure({ rawDir: path.join(root, 'raw'), settlementsDir: path.join(root, 'set') });
const n = Number(process.env.N || 1000);
let t = performance.now();
for (let i = 0; i < n; i++) { appendRaw('bench', i % 2 ? 'ai' : 'user', 'line ' + i); }
const appendMs = performance.now() - t;
t = performance.now();
for (let i = 0; i < n; i++) readState('bench');
const stateMs = performance.now() - t;
const pool = new ActivationPool({ capacity: 50, hot: 5 });
t = performance.now();
for (let i = 0; i < n; i++) pool.set('r' + (i % 100), { relevance: (i % 10) / 10, confidence: 0.8 });
const activationMs = performance.now() - t;
console.log(JSON.stringify({ n, appendMs: +appendMs.toFixed(1), stateReadMs: +stateMs.toFixed(1), activationMs: +activationMs.toFixed(1), pool: pool.size }));
fs.rmSync(root, { recursive: true, force: true });
