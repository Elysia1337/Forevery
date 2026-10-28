# 崩溃恢复与幂等

## 原则

原文先落，打标后补；补标可以慢，不能丢。

## 写入

- `appendRaw` 每轮追加，状态置 `pending`；
- 同一轮重试需要幂等键，避免重复；
- `commitSettlement` 用临时文件 + rename，避免半截 JSON；
- 带 `idempotencyKey` 的重复提交返回旧 settlement，不递增 revision。

## 崩溃后

1. 扫 `pending` 状态；
2. 优先用原会话续接补标（高置信）；
3. 原会话不可用才读原文补标，标 `low`；
4. 补标结果不能覆盖 `high`；
5. 索引只收 `tagged`，`pending` 不可见。

## 持久化队列（已提供）

```js
import { TagQueue } from 'forevery/queue';
const q = new TagQueue('./data/tag-queue.json', { leaseMs: 5*60*1000, maxAttempts: 3 });
q.enqueue({ sessionId });
const job = q.claim();
q.ack(job.id);        // 成功
q.fail(job.id, 'err'); // 失败；超过 maxAttempts 进 dead
q.recover();          // 进程重启后，把过期 claimed 放回 pending
```

- 原子写：tmp + rename；主文件坏了回退 `.tmp`；
- claim 带 lease，崩溃后自动回收；
- 失败重试到上限进 dead，不无限循环；
- 队列只存 job，不存原文；原文仍在 raw。

## 落库队列（标完入队）

```js
import { enqueueSettlement, drainSettlementQueue } from 'forevery/settle-queue';
const { id } = enqueueSettlement({ sessionId, transcript, rounds, options });
const out = drainSettlementQueue({ max: 20, untilId: id });
```

- 模型已经打完标，队列只负责落库；
- 桥/插件可以落库后立刻 `drain`，也可以交给后台工人；
- 失败重试、租约回收、死信沿用队列那套；
- 进程启动时先 `drainSettlementQueue({ max: 50 })`，清掉上次残留；
- `deadSettlementJobs()` / `queueSnapshot()` 可做告警。
- 不改变落库校验，只改变“什么时候写”。

## 队列建议

- 持久化队列 + 重试 + 死信；
- 单写多读或按会话分区；
- 会话级锁/乐观并发；
- 打标任务可重入、可去重；
- 预留 `tombstone` / `superseded_by`，删除和修正可传播。

## 测试

- `test/queue-crash.test.mjs`：子进程 enqueue → claim → `SIGKILL`，父进程等租约过期后 `recover`，重新 claim 并 ack；
- `test/queue.test.mjs`：坏主文件回退 `.tmp`、失败进 dead、租约过期恢复；
- 还应补：写一半、打标一半、索引一半；重启后能自愈，不产生重复索引。
