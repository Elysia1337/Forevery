// Minimal lexical retriever for examples/tests. Not a replacement for a real vector/LLM router.
import fs from 'node:fs';
import path from 'node:path';
const base = c => String(c || '').split('-')[0];
const isHan = s => /[\u4e00-\u9fff]/.test(s);
export function tokens(text) {
  const s = String(text || '').toLowerCase();
  const out = [];
  for (const m of s.matchAll(/[\u4e00-\u9fff]{1,2}|[a-z0-9_]+/g)) out.push(m[0]);
  return [...new Set(out)];
}
function overlap(q, text) {
  if (!q.length) return 0;
  const t = new Set(tokens(text));
  let hit = 0; for (const x of q) if (t.has(x)) hit += 1;
  return hit / q.length;
}
export function buildIndex(records) {
  return (records || []).filter(r => !r.tombstone && !r.superseded_by);
}
export function search(records, query = {}) {
  const qText = String(query.text || query.query || '');
  const qTokens = tokens(qText);
  const qCodes = (query.codes || []).map(base);
  const qEntities = new Set(query.entities || []);
  const qScenes = new Set(query.scenes || []);
  const qFocus = query.focus || '';
  const out = [];
  for (const r of buildIndex(records)) {
    const textScore = overlap(qTokens, [r.title, r.text, ...(r.entities || []), ...(r.scenes || [])].join(' '));
    const codes = (r.c_codes || r.p_codes || []).map(base);
    const codeScore = qCodes.length && codes.some(c => qCodes.includes(c)) ? 1 : 0;
    const entityScore = [...qEntities].filter(e => (r.entities || []).includes(e)).length / Math.max(1, qEntities.size);
    const sceneScore = [...qScenes].filter(s => (r.scenes || []).includes(s)).length / Math.max(1, qScenes.size);
    const focusScore = qFocus && r.focus === qFocus ? 1 : 0;
    const score = qCodes.length
      ? 0.5 * codeScore + 0.3 * textScore + 0.1 * sceneScore + 0.05 * entityScore + 0.05 * focusScore
      : 0.4 * textScore + 0.3 * entityScore + 0.15 * sceneScore + 0.15 * focusScore;
    out.push({ ...r, score: +score.toFixed(6) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, query.top || 4);
}
export function buildIndexFromStore(store) {
  const out = [];
  for (const s of store.listSettlements()) {
    const tp = path.join(store.root, 'settlements', s.session_id + '.transcript.jsonl');
    let turns = [];
    try { turns = fs.readFileSync(tp, 'utf8').trim().split('\n').map(JSON.parse); } catch {}
    const byId = new Map(turns.map(t => [t.id, t]));
    for (const r of s.rounds || []) {
      if (r.tombstone || r.superseded_by) continue;
      const a = byId.get(r.span?.[0]), b = byId.get(r.span?.[1]);
      const ia = turns.findIndex(t => t.id === a?.id), ib = turns.findIndex(t => t.id === b?.id);
      out.push({ id: `${s.session_id}:${r.id}`, title: r.title, scope: r.scope, text: (ia >= 0 && ib >= ia ? turns.slice(ia, ib + 1).map(t => t.text).join(' ') : ''), p_codes: r.p_codes, c_codes: r.c_codes, entities: r.entities, scenes: r.scenes, focus: r.focus, tombstone: r.tombstone, superseded_by: r.superseded_by });
    }
  }
  return out;
}
