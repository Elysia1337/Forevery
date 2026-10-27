# Benchmark（写路径回放）

这不是召回质量基准，只是写路径、队列、激活层的吞吐基线。召回质量要用真实会话 golden set 单独跑。

## 运行

```bash
npm run bench:replay
SESSIONS=200 ROUNDS=8 npm run bench:replay
```

## 本机样例（2026-10-27）

50 个会话 × 4 轮：

```json
{
  "sessions": 50,
  "rounds": 4,
  "commits": 50,
  "totalMs": 76.5,
  "commitMs": 30,
  "queueMs": 24.2,
  "queueClaimed": 50,
  "activationMs": 0.121,
  "hot": 5,
  "settlements": 50,
  "bytes": 69591
}
```

- 约 1.5ms/会话提交；
- 队列 claim+ack 约 0.5ms/条；
- 激活池 50 条 0.12ms；
- 50 个 settlement 约 68KB。

## 边界

- 文件存储，单进程；不是并发写基准；
- 不含模型调用、不含向量检索；
- 数据是合成的，不代表真实召回效果；
- 规模到 1 万条后要重新测，重点看索引重建和文件列表。
