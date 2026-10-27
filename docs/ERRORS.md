# 错误码与版本策略

## 错误码

| 码 | 含义 | 可重试 |
|---|---|---|
| `E_VALIDATION` | settlement 校验失败 | 交回模型重试 |
| `E_SESSION` | 缺 sessionId | 否 |
| `E_IDEMPOTENT` | 幂等命中（通常不是错误） | 是 |
| `E_IO` | 文件/队列读写失败 | 视情况 |
| `E_QUEUE_EMPTY` | 队列无 pending | 否 |
| `E_QUEUE_DEAD` | 任务进死信 | 人工处理 |

```js
import { ERRORS, MemoryError, fromValidation, normalizeError } from 'forevery/errors';
```

核心的 `commitSettlement` 仍返回 `{ ok:false, errors }`，不抛异常；适配器需要时用 `fromValidation` 转成 `MemoryError`。

## 版本策略

- 核心 API 用 semver：`1.x` 只加可选字段/方法，`2.0` 才做破坏性改动；
- settlement `schema_version` 当前 `1.0`，字段只增不删；
- P/C 码表用 `codebook_version`，换码表不要求重标；
- 迁移工具必须支持回滚；升级不能要求用户重建全部索引；
- `types/index.d.ts` 是当前 TypeScript 契约。

## 重试

- 校验失败：把 `errors` 原样交回模型，最多 2 次；
- IO 失败：退避重试，队列 `fail` 计次；
- 幂等键命中：返回旧结果，不重复写；
- 超过 `maxAttempts`：进 dead，告警，不无限重试。
