import test from 'node:test';
import assert from 'node:assert/strict';
import { search, buildIndex } from '../src/retrieval.mjs';

const records = [
  { id: 'a', title: '谢谢晚饭', text: '谢谢爸爸的晚饭', p_codes: ['H009-2'], c_codes: ['H009-2'], entities: ['爸爸', '晚饭'], scenes: ['晚饭'], focus: 'Alice' },
  { id: 'b', title: '晚安', text: '晚安，明天见', p_codes: ['L005-2'], c_codes: ['L005-2'], entities: ['晚安'], scenes: ['睡前'], focus: 'Alice' },
  { id: 'c', title: '删除的', text: '谢谢', p_codes: ['H009-2'], c_codes: ['H009-2'], entities: ['谢谢'], scenes: ['日常'], tombstone: true },
];

test('code + text ranks event', () => {
  const top = search(records, { text: '谢谢晚饭', codes: ['H009-2'], top: 2 });
  assert.equal(top[0].id, 'a');
});
test('tombstone hidden', () => {
  assert.equal(buildIndex(records).some(r => r.id === 'c'), false);
});
test('event query uses entities', () => {
  const top = search(records, { text: '晚安', entities: ['晚安'], top: 1 });
  assert.equal(top[0].id, 'b');
});
