// Shared memory core: raw append, tagging state, quiet window, settlement commit.
// Model-agnostic: adapters own the model call; this module owns storage/schema/validation.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const CORE_VERSION = '1.0.0';
export const SETTLEMENT_SCHEMA_VERSION = '1.0';

const cfg = {
  rawDir: process.env.MEMORY_RAW_DIR || './data/raw',
  settlementsDir: process.env.MEMORY_SETTLEMENTS_DIR || './data/settlements',
  indexer: process.env.MEMORY_INDEXER || '',
  indexDir: process.env.MEMORY_INDEX_DIR || './data/index',
  focusNames: [],
  actionWords: [],
  daily: process.env.MEMORY_ROLLUP || '',
  quietFile: process.env.MEMORY_QUIET_FILE || './data/quiet.json',
  controlFile: process.env.MEMORY_CONTROL_FILE || './data/control.json',
  recentDir: process.env.MEMORY_RECENT_DIR || './data/recent',
};
export function configure(next = {}) { for (const [k, v] of Object.entries(next)) if (v !== undefined) cfg[k] = v; }
export function config() { return { ...cfg }; }

const safe = s => String(s || '').replace(/[^A-Za-z0-9_.-]/g, '_');
const now = () => new Date().toISOString();
const statePath = sid => path.join(cfg.rawDir, safe(sid) + '.state.json');

export function readState(sid) {
  try { return JSON.parse(fs.readFileSync(statePath(sid), 'utf8')); } catch { return null; }
}
function writeState(sid, st) {
  fs.mkdirSync(cfg.rawDir, { recursive: true });
  fs.writeFileSync(statePath(sid), JSON.stringify(st, null, 2) + '\n');
}
export function appendRaw(sid, role, text, meta = {}) {
  if (!sid || !text) return null;
  fs.mkdirSync(cfg.rawDir, { recursive: true });
  const rec = { id: 'm' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), session_id: String(sid), role, text: String(text), time: now(), ...meta };
  fs.appendFileSync(path.join(cfg.rawDir, safe(sid) + '.jsonl'), JSON.stringify(rec) + '\n');
  const st = readState(sid);
  if (!st) writeState(sid, { session_id: String(sid), status: 'pending', confidence: null, version: 0, updated_at: now() });
  else if (st.status === 'tagged') { st.status = 'pending'; st.confidence = null; st.updated_at = now(); writeState(sid, st); }
  return rec;
}
export function listPending() {
  try {
    return fs.readdirSync(cfg.rawDir).filter(f => f.endsWith('.state.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(cfg.rawDir, f), 'utf8')))
      .filter(s => s.status === 'pending');
  } catch { return []; }
}
export function markTagged(sid, confidence = 'high') {
  if (!sid) return;
  const st = readState(sid) || { session_id: String(sid), status: 'pending', confidence: null, version: 0 };
  st.status = 'tagged'; st.confidence = confidence; st.version = (st.version || 0) + 1; st.updated_at = now();
  writeState(sid, st);
}

function loadControl() { try { return JSON.parse(fs.readFileSync(cfg.controlFile, 'utf8')); } catch { return {}; } }
function saveControl(o) { fs.mkdirSync(path.dirname(cfg.controlFile), { recursive: true }); fs.writeFileSync(cfg.controlFile, JSON.stringify(o, null, 2) + '\n'); }
export function setPause(key, mode, reason = '') { const o = loadControl(); o[key] = { paused: mode, reason, updated_at: now() }; saveControl(o); }
export function getPause(key) { return loadControl()[key] || null; }
export function clearPause(key) { const o = loadControl(); if (o[key]) { delete o[key]; saveControl(o); } }
export function isPaused(key, mode = 'all') {
  const v = loadControl()[key];
  if (!v || !v.paused) return false;
  if (v.paused === 'all') return true;
  return v.paused === mode;
}
function loadQuiet() { try { return JSON.parse(fs.readFileSync(cfg.quietFile, 'utf8')); } catch { return {}; } }
function saveQuiet(o) { fs.mkdirSync(path.dirname(cfg.quietFile), { recursive: true }); fs.writeFileSync(cfg.quietFile, JSON.stringify(o, null, 2) + '\n'); }
export function markQuiet(key, until, reason = '') { const o = loadQuiet(); o[key] = { until, reason }; saveQuiet(o); }
export function clearQuiet(key) { const o = loadQuiet(); if (o[key]) { delete o[key]; saveQuiet(o); } }
export function isQuiet(key) { const v = loadQuiet()[key]; return !!(v && v.until > Date.now()); }
export function quietInfo(key) { return loadQuiet()[key] || null; }

const isFocus = x => !cfg.focusNames?.length || cfg.focusNames.includes(x);
const SCOPE = new Set(['family', 'work', 'knowledge', 'mixed']);
const CODE_RE = /^(Z000|[LHNAJEG][0-9]{3}-[1-5])$/;
const EMOTION_RE = /我怕|我难受|我舍不得|我生气|我开心|我心疼|我愧疚|我委屈|我慌|我后悔|我烦|我累|我空落/;
const isAction = x => (cfg.actionWords || []).includes(x);

export function validateSettlement({ transcript, rounds }) {
  const errors = [];
  const ids = transcript.map(t => t.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  if (!Array.isArray(rounds) || !rounds.length) return ['rounds empty'];
  let prev = -1; const seen = new Set();
  for (const [i, r] of rounds.entries()) {
    const w = `round[${i}] ${r.id || ''}`;
    if (!r.id) errors.push(`${w}: missing id`); else if (seen.has(r.id)) errors.push(`${w}: duplicate id`); else seen.add(r.id);
    if (!r.title || !String(r.title).trim()) errors.push(`${w}: empty title`);
    if (!SCOPE.has(r.scope)) errors.push(`${w}: bad scope ${r.scope}`);
    if (!Array.isArray(r.span) || r.span.length !== 2) { errors.push(`${w}: bad span`); continue; }
    const a = idx.get(r.span[0]), b = idx.get(r.span[1]);
    if (a === undefined || b === undefined) { errors.push(`${w}: span id missing`); continue; }
    if (b < a) errors.push(`${w}: span reversed`);
    if (i === 0 && a !== 0) errors.push(`${w}: first round must start at ${ids[0]}`);
    if (prev >= 0 && a !== prev + 1) errors.push(`${w}: gap/overlap (expected ${prev + 1}, got ${a})`);
    prev = b;
    const len = b - a + 1;
    if (len === 1) errors.push(`${w}: 1 turn`);
    if (len === 2 && r.short !== true) errors.push(`${w}: 2 turns requires short=true`);
    if (len > 10) errors.push(`${w}: ${len} turns exceeds 10`);
    if (r.skipped === true) {
      if (!r.reason || !String(r.reason).trim()) errors.push(`${w}: skipped needs reason`);
      continue;
    }
    if (!isFocus(r.focus)) errors.push(`${w}: bad focus ${r.focus}`);
    const p = r.p_codes || r.codes || [];
    const c = r.c_codes || r.p_codes || r.codes || [];
    for (const [label, arr] of [['p_codes', p], ['c_codes', c]]) {
      if (!Array.isArray(arr) || arr.length > 2) errors.push(`${w}: ${label} >2`);
      for (const code of arr) if (!CODE_RE.test(code)) errors.push(`${w}: bad ${label} ${code}`);
    }
    const text = transcript.slice(a, b + 1).map(t => t.text).join('\n');
    if (r.scope === 'work' && !(c.length === 1 && c[0] === 'Z000') && !EMOTION_RE.test(text)) errors.push(`${w}: work needs Z000`);
    if (!Array.isArray(r.entities) || r.entities.length < 1) errors.push(`${w}: entities empty`);
    else {
      if (r.entities.length > 6) errors.push(`${w}: >6 entities`);
      if (r.entities.filter(e => !isFocus(e)).length < 2) errors.push(`${w}: need 2 non-speaker entities`);
    }
    if (!Array.isArray(r.scenes) || !r.scenes.length) errors.push(`${w}: scenes empty`);
    else {
      if (r.scenes.length > 4) errors.push(`${w}: >4 scenes`);
      if (r.scenes.every(isAction)) errors.push(`${w}: scenes all actions`);
    }
    if (Array.isArray(r.participants)) for (const p of r.participants) if (!isFocus(p)) errors.push(`${w}: participant ${p}`);
  }
  if (prev !== ids.length - 1) errors.push(`last round must end at ${ids[ids.length - 1]}`);
  return errors;
}

function writeContinuity(key, transcript, rounds) {
  if (!key) return;
  try {
    const last = rounds.slice(-3).map(r => {
      if (r.skipped) return `- ${r.title}：${r.reason || '没有记'}`;
      const idxA = transcript.findIndex(t => t.id === r.span?.[0]);
      const idxB = transcript.findIndex(t => t.id === r.span?.[1]);
      const text = (idxA >= 0 && idxB >= idxA ? transcript.slice(idxA, idxB + 1) : [])
        .map(t => t.text).join(' ').replace(/\s+/g, ' ').slice(0, 220);
      return `- ${r.title}：${text}`;
    }).join('\n');
    const body = `## 最近一次收尾\n${last}\n`;
    fs.mkdirSync(cfg.recentDir, { recursive: true });
    fs.writeFileSync(path.join(cfg.recentDir, safe(key) + '.md'), body.slice(0, 700));
  } catch {}
}
export function readContinuity(key) {
  try { return fs.readFileSync(path.join(cfg.recentDir, safe(key) + '.md'), 'utf8').trim(); } catch { return ''; }
}

export function commitSettlement({
  sessionId, transcript, rounds, settledBy = 'agent', inContext = true,
  micro = false, confidence = 'high', imported = false, recovered = false,
  reannotated = false, source = 'settle', autoIndex = true, continuityKey = '',
  codebookVersion = '', observedAt = '', eventTime = '', validFrom = '', validUntil = '',
  expiresAt = '', tombstone = false, supersedes = '', supersededBy = '', idempotencyKey = '',
}) {
  const errors = validateSettlement({ transcript, rounds });
  if (errors.length) return { ok: false, errors };
  if (!sessionId) return { ok: false, errors: ['missing sessionId'] };
  if (idempotencyKey) {
    try { const old = JSON.parse(fs.readFileSync(path.join(cfg.settlementsDir, safe(sessionId) + '.json'), 'utf8')); if (old.idempotency_key === idempotencyKey) return { ok: true, path: path.join(cfg.settlementsDir, safe(sessionId) + '.json'), settlement: old, idempotent: true }; } catch {}
  }
  fs.mkdirSync(cfg.settlementsDir, { recursive: true });
  const s = safe(sessionId);
  const sp = path.join(cfg.settlementsDir, s + '.json');
  let revision = 1;
  if (fs.existsSync(sp)) {
    try { revision = (JSON.parse(fs.readFileSync(sp, 'utf8')).revision || 0) + 1; } catch {}
    try { fs.copyFileSync(sp, sp + '.bak-' + now().replace(/[:.]/g, '-')); } catch {}
  }
  fs.writeFileSync(path.join(cfg.settlementsDir, s + '.transcript.jsonl'), transcript.map(t => JSON.stringify(t)).join('\n') + '\n');
  const settlement = {
    version: SETTLEMENT_SCHEMA_VERSION, schema_version: SETTLEMENT_SCHEMA_VERSION,
    session_id: String(sessionId), revision, settled_at: now(),
    codebook_version: codebookVersion, observed_at: observedAt, event_time: eventTime,
    valid_from: validFrom, valid_until: validUntil, expires_at: expiresAt,
    tombstone: !!tombstone, supersedes, superseded_by: supersededBy, idempotency_key: idempotencyKey,
    settled_by: settledBy, in_context: inContext, micro, confidence,
    imported, recovered, reannotated, source,
    start: transcript[0].id, end: transcript[transcript.length - 1].id,
    rounds, quality: { turns: transcript.length, rounds: rounds.length, coverage: 'full', confidence },
  };
  const tmp = sp + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settlement, null, 2) + '\n');
  fs.renameSync(tmp, sp);
  markTagged(sessionId, confidence);
  writeContinuity(continuityKey, transcript, rounds);
  if (autoIndex && cfg.indexer) {
    const env = { ...process.env, SETTLE_DIR: cfg.settlementsDir, RAW_DIR: cfg.rawDir };
    try { spawnSync(process.execPath, [cfg.daily], { timeout: 60000, windowsHide: true, env }); } catch {}
    try { spawnSync(process.execPath, [cfg.indexer, cfg.settlementsDir, cfg.indexDir], { timeout: 30000, windowsHide: true, env }); } catch {}
  }
  return { ok: true, path: sp, settlement };
}

export function coreInfo() {
  return { version: CORE_VERSION, config: config() };
}
