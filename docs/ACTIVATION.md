# 半激发（可选）

默认关闭，必须由使用者自己打开。它只影响排序、缓存预热和候选池，**不写事实层**，也不直接进入上下文。

关闭时：不建激活池、不做候选预热、不做弱提示；基础召回和连续性卡不受影响。

开关在适配器配置里，不由核心自动开启。

## 四层

```
事实层：原文，唯一可信
索引层：P/C、置信度、灰色库，持久化
激活层：实时语境产生的临时候选，可衰减、可丢弃
注入层：真正进入 prompt 的内容
```

激活层可以宽，注入层必须窄。

## 激活池

```js
import { ActivationPool } from 'forevery/activation';

const pool = new ActivationPool({ capacity: 50, hot: 5, ttlMs: 10 * 60 * 1000, ttlRounds: 5 });
pool.set('round-42', { relevance: 0.8, confidence: 0.9, contextFit: 0.7, salience: 1, freshness: 0.9, repetition: 1 });
pool.nextRound();
pool.candidates(5);
```

- 容量 20–50，真正热 3–5；
- TTL 3–5 轮或 10 分钟；
- 纯内存，不落盘；跨会话不保留。

## 注入门控

```js
import { injectScore, decideChannel } from 'forevery/activation';

const score = injectScore({ relevance, confidence, need, naturalness, interruptionCost, focus });
const channel = decideChannel({ score, mode: 'focus' });
```

- `silent`：只影响检索排序/缓存，不占 token；
- `weak`：极短锚点，模型自行决定是否展开；
- `strong`：只有高相关、高置信、确实需要时才进上下文。

模式阈值：

| 模式 | weak | strong |
|---|---|---|
| focus（默认） | 0.45 | 0.75 |
| companion | 0.25 | 0.55 |
| creative | 0.20 | 0.65 |

## 三条原则

1. 半激发负责“想得起”，门控负责“说不说”；
2. 非必要情况优先 silent/weak，不显式插话；
3. 关掉半激发，基础召回仍要能查到；否则先修基础召回，不要加半激发。

## 工程边界

- 可选模块/feature flag，默认关闭；
- 激活事件进可观测流，不进事实库；
- 激活层不改变 settlement / index schema；
- 删除/更新仍由 tombstone / supersede 负责，不靠激活层。
