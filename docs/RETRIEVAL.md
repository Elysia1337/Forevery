# 最小检索器

`forevery/retrieval` 只做示例和基准，不是生产检索引擎。

```js
import { search } from 'forevery/retrieval';

search(records, {
  text: '谢谢晚饭',
  codes: ['H009-2'],
  entities: ['爸爸', '晚饭'],
  scenes: ['晚饭'],
  focus: 'Alice',
  top: 3,
});
```

- 有码时：码 0.5、文本 0.3、场景 0.1、实体 0.05、focus 0.05；
- 无码时：文本 0.4、实体 0.3、场景 0.15、focus 0.15；
- `tombstone` / `superseded_by` 自动过滤；
- 中文按 1–2 字切，英文按词。

## 边界

- 没有向量、没有模型、没有查询改写；
- 不代表真实召回质量；
- 生产环境应换成自己的多路召回（原文/向量/P-C/时间/关系）；
- 它只用于 golden 回放和快速验证。

## Golden

```bash
npm run bench:golden
```

当前合成 5 条查询，top1/top3 都是 5/5；数据是手写的，只证明接口和过滤逻辑，不证明真实效果。
