import test from 'node:test';
import assert from 'node:assert/strict';
import { isClosing, parseCommand } from '../src/triggers.mjs';

test('does not treat 干完工作 as closing', () => {
  assert.equal(isClosing('去玩会吧女儿，干完工作爸爸来找你'), false);
});
test('still treats 完工 as closing', () => {
  assert.equal(isClosing('爱莉姆完工'), true);
});
test('pause and resume', () => {
  assert.equal(parseCommand('先别记').type, 'pause-all');
  assert.equal(parseCommand('暂停收尾').type, 'pause-autosettle');
  assert.equal(parseCommand('继续记忆').type, 'resume');
});
