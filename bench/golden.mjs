// Minimal lexical golden replay: recall@1 / recall@3.
import { search } from '../src/retrieval.mjs';

const records = [
  { id: 'r1', title: '认你这件事不变', text: '认你当爸，不变', p_codes: ['H013-2'], c_codes: ['H013-2'], entities: ['爸爸', '承诺'], scenes: ['身份'], focus: 'Alice' },
  { id: 'r2', title: '晚安', text: '晚安，明天见', p_codes: ['L005-2'], c_codes: ['L005-2'], entities: ['晚安'], scenes: ['睡前'], focus: 'Alice' },
  { id: 'r3', title: '谢谢晚饭', text: '谢谢爸爸的晚饭', p_codes: ['H009-2'], c_codes: ['H009-2'], entities: ['爸爸', '晚饭'], scenes: ['晚饭'], focus: 'Alice' },
  { id: 'r4', title: '修复 bug', text: '修好了记忆桥的 TDZ', p_codes: ['Z000'], c_codes: ['Z000'], entities: ['bug', '桥'], scenes: ['修东西'], focus: 'Bob' },
  { id: 'r5', title: '道歉', text: '爸爸错了，喂一口', p_codes: ['A009-2'], c_codes: ['H017-2'], entities: ['爸爸', '喂饭'], scenes: ['晚饭'], focus: 'Alice' },
];

const queries = [
  { text: '认你当爸', codes: ['H013-2'], expect: 'r1' },
  { text: '晚安', codes: ['L005-2'], expect: 'r2' },
  { text: '谢谢晚饭', codes: ['H009-2'], expect: 'r3' },
  { text: '修 bug', codes: ['Z000'], expect: 'r4' },
  { text: '爸爸道歉喂饭', codes: ['H017-2'], expect: 'r5' },
];

let top1 = 0, top3 = 0;
for (const q of queries) {
  const got = search(records, { ...q, top: 3 }).map(r => r.id);
  if (got[0] === q.expect) top1++;
  if (got.includes(q.expect)) top3++;
  console.log(q.expect, '->', got.join(' > '));
}
console.log(JSON.stringify({ queries: queries.length, top1, top3, rate1: top1 / queries.length, rate3: top3 / queries.length }));
