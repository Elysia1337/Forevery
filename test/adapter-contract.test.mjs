import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '../adapters/file-store.mjs';
import { mockModel, basicRounds, basicTranscript } from '../adapters/mock-model.mjs';
import { configure } from '../src/index.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-adapter-'));
configure({ focusNames: ['Alice', 'Bob'], actionWords: ['hug'] });
const store = new FileStore(root);

test('append creates pending', () => {
  store.append('c1', 'user', 'hello');
  assert.equal(store.state('c1').status, 'pending');
});

test('mock model commits tagged', async () => {
  const model = mockModel(basicRounds());
  const rounds = (await model()).rounds;
  const r = store.commit({ sessionId: 'c2', transcript: basicTranscript(), rounds, autoIndex: false });
  assert.equal(r.ok, true);
  assert.equal(store.state('c2').status, 'tagged');
  assert.equal(store.listSettlements().length, 1);
});

test('tombstone is hidden from list', () => {
  const rounds = basicRounds();
  const r = store.commit({ sessionId: 'c3', transcript: basicTranscript(), rounds, autoIndex: false, tombstone: true });
  assert.equal(r.ok, true);
  assert.equal(store.listSettlements().some(s => s.session_id === 'c3'), false);
});

test('idempotent commit', () => {
  const a = store.commit({ sessionId: 'c4', transcript: basicTranscript(), rounds: basicRounds(), autoIndex: false, idempotencyKey: 'k' });
  const b = store.commit({ sessionId: 'c4', transcript: basicTranscript(), rounds: basicRounds(), autoIndex: false, idempotencyKey: 'k' });
  assert.equal(a.ok, true);
  assert.equal(b.idempotent, true);
});
