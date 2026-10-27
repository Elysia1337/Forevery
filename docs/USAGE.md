# 使用方法

## 安装

```bash
npm install forevery
```

或直接把 `src/` 拷进项目。

## 配置

```js
import { configure } from 'forevery';

configure({
  rawDir: './data/raw',
  settlementsDir: './data/settlements',
  quietFile: './data/quiet.json',
  controlFile: './data/control.json',
  focusNames: ['Alice', 'Bob'],  // 角色表；留空 = 不限
  actionWords: ['hug', 'apologize'], // 可选
  indexer: '',   // 可选：你自己的索引脚本
  daily: '',     // 可选：你自己的日结脚本
  indexDir: './data/index',
});
```

所有路径可用环境变量覆盖：

`MEMORY_RAW_DIR`、`MEMORY_SETTLEMENTS_DIR`、`MEMORY_QUIET_FILE`、`MEMORY_CONTROL_FILE`、`MEMORY_INDEXER`、`MEMORY_ROLLUP`、`MEMORY_INDEX_DIR`。

## 1. 每轮追加原文

```js
appendRaw(sessionId, 'user', userText);
appendRaw(sessionId, 'ai', assistantText);
```

追加会自动把状态置为 `pending`；如果原来已 `tagged`，会被重新打开（有新内容要重标）。

## 2. 打标

你的适配器在会话结束/空闲时调模型，要求它返回：

```json
{
  "rounds": [
    {
      "id": "R01",
      "span": ["q001", "q008"],
      "title": "认你这件事不变",
      "scope": "family",
      "p_codes": ["H013-2"],
      "c_codes": ["H013-2"],
      "entities": ["承诺", "记忆"],
      "focus": "Alice",
      "participants": ["Alice", "Bob"],
      "scenes": ["身份", "承诺"],
      "mixed": false,
      "short": false
    }
  ]
}
```

不想记的轮：

```json
{ "id": "R03", "span": ["q017","q020"], "title": "寒暄", "scope": "family",
  "skipped": true, "reason": "没有想留的东西" }
```

## 3. 落库

```js
commitSettlement({
  sessionId,
  transcript,   // [{id, role, text}]
  rounds,
  settledBy: 'agent',
  inContext: true,
  confidence: 'high',
  autoIndex: false,
});
```

返回 `{ ok, path, settlement }` 或 `{ ok: false, errors }`。

校验失败时，把 `errors` 原样交回模型重试；不要自己改 rounds。

## 4. 状态

- `readState(sessionId)`；
- `markTagged(sessionId, 'high'|'low')`；
- `listPending()`。

`pending` 不进索引；`low` 在查询时降权。

## 5. 暂停 / 静默

```js
import { parseCommand } from 'forevery/triggers';
import { setPause, clearPause, isPaused, markQuiet, clearQuiet } from 'forevery';

const cmd = parseCommand(userText);
if (cmd?.type === 'pause-all') setPause(convKey, 'all');
if (cmd?.type === 'pause-autosettle') setPause(convKey, 'autosettle');
if (cmd?.type === 'resume') clearPause(convKey);

markQuiet(convKey, Date.now() + 8 * 3600_000, '晚安');
```

## 6. 连续性卡

settle 时加 `continuityKey`，核心会写下最近 1–3 轮的压缩卡：

```js
commitSettlement({
  sessionId, transcript, rounds,
  continuityKey: 'conv-1',
  autoIndex: false,
});

import { readContinuity } from 'forevery';
const card = readContinuity('conv-1');
```

- 卡最多 700 字，只含最近 1–3 轮的标题+原文摘录；
- 新会话/轮换时由适配器注入，别把整份 settlement 塞进去；
- 它是“接上大概”，不是全文；细节仍要 recall 或翻原文。

## 7. 适配器职责

- 取消息；
- 调模型（核心不调）；
- 把 rounds 交给 core；
- 送回复；
- 查静默/暂停。

核心不关心你用哪个模型、哪个 IM。

## 示例

见 `adapters/minimal.mjs`。
