import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configure, commitSettlement, readState, validateSettlement, setPause, isPaused, markQuiet, isQuiet } from '../src/index.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-kit-'));
configure({
  rawDir: path.join(root, 'raw'),
  settlementsDir: path.join(root, 'set'),
  quietFile: path.join(root, 'quiet.json'),
  controlFile: path.join(root, 'control.json'),
  focusNames: ['Alice', 'Bob'],
  actionWords: ['hug'],
});

const transcript = [
  { id: 'q001', role: 'user', text: '谢谢' },
  { id: 'q002', role: 'ai', text: '不客气' },
  { id: 'q003', role: 'user', text: '明天见' },
  { id: 'q004', role: 'ai', text: '明天见' },
];
const rounds = [
  { id: 'R01', span: ['q001','q002'], title: '道谢', scope: 'family', short: true, p_codes: ['H009-2'], c_codes: ['H009-2'], entities: ['道谢','今天'], focus: 'Alice', participants: ['Alice','Bob'], scenes: ['日常'] },
  { id: 'R02', span: ['q003','q004'], title: '寒暄', scope: 'family', short: true, skipped: true, reason: '没有想留的东西' },
];

test('validate accepts skipped', () => assert.deepEqual(validateSettlement({ transcript, rounds }), []));

test('commit writes settlement and state', () => {
  const r = commitSettlement({ sessionId: 's1', transcript, rounds, autoIndex: false });
  assert.equal(r.ok, true);
  assert.ok(fs.existsSync(r.path));
  assert.equal(readState('s1').status, 'tagged');
});

test('invalid round is rejected', () => {
  const bad = [{ id: 'R01', span: ['q001','q001'], title: 'x', scope: 'family' }];
  const r = commitSettlement({ sessionId: 's2', transcript, rounds: bad, autoIndex: false });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /1 turn/.test(e)));
});

test('pause and quiet', () => {
  setPause('c1', 'all');
  assert.equal(isPaused('c1'), true);
  markQuiet('c1', Date.now() + 1000);
  assert.equal(isQuiet('c1'), true);
});
