// Reference file-backed adapter. It only wires the core; it does not call a model.
import fs from 'node:fs';
import path from 'node:path';
import {
  configure, appendRaw, readState, commitSettlement, markTagged,
  markQuiet, clearQuiet, isQuiet, readContinuity,
} from '../src/index.mjs';

export class FileStore {
  constructor(root) {
    this.root = path.resolve(root);
    configure({
      rawDir: path.join(this.root, 'raw'),
      settlementsDir: path.join(this.root, 'settlements'),
      quietFile: path.join(this.root, 'quiet.json'),
      controlFile: path.join(this.root, 'control.json'),
      recentDir: path.join(this.root, 'recent'),
    });
  }
  append(sessionId, role, text) { return appendRaw(sessionId, role, text); }
  state(sessionId) { return readState(sessionId); }
  tag(sessionId, confidence = 'high') { markTagged(sessionId, confidence); }
  commit(options) { return commitSettlement(options); }
  continuity(key) { return readContinuity(key); }
  quiet(key, until, reason) { markQuiet(key, until, reason); }
  clearQuiet(key) { clearQuiet(key); }
  isQuiet(key) { return isQuiet(key); }
  listSettlements() {
    const dir = path.join(this.root, 'settlements');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.startsWith('imported-') && !f.includes('.bak-'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
      .filter(s => !s.tombstone && !s.superseded_by);
  }
}
