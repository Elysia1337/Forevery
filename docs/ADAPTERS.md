# 适配器契约

核心不调模型。适配器必须保证下面几件事，否则换模型/换 IM 就会漂。

## 必须实现

1. **原文追加**
   - 每轮 user / assistant 都调 `appendRaw`；
   - 同一轮失败可重试，但要有幂等键；
   - 不要只写“打标成功”的轮。

2. **状态**
   - 新会话为 `pending`；
   - settle 成功标 `tagged`；
   - 补标标 `low`，不能覆盖当场 `high`。

3. **提交**
   - 模型返回 `rounds`，适配器只做原话→span 映射；
   - 校验失败把 `errors` 原样交回模型；
   - 提交带 `idempotencyKey`，重试不能重复落库。

4. **生命周期**
   - 删除用 `tombstone`，不要物理删；
   - 修正用 `supersedes` / `superseded_by`；
   - 写入 `schema_version`、`codebook_version`。

5. **暂停/静默**
   - 暂停期间不追加原文或只停自动打标，由适配器声明；
   - 主动发送前查 `isQuiet(key)`。

## 参考实现

- `adapters/minimal.mjs`：最小示例；
- `adapters/file-store.mjs`：文件版 store，封装 append/state/commit/list；
- `adapters/mock-model.mjs`：确定性 mock 模型，用于契约测试；
- `adapters/sqlite-queue.mjs`：数据库版打标队列，需要 Node 22+ 自带的数据库模块；文件版仍是默认。
- 核心自带 `appendRaw` / `commitSettlement`，可直接作为文件 store。

## 契约测试

`npm test` 覆盖：

- 原文 → pending；
- settle → tagged；
- skipped 轮；
- 无效轮拒绝；
- 幂等键；
- 生命周期字段；
- 暂停/静默。

新适配器至少跑通这些，再接自己的模型。
