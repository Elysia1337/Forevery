# memory-settle-kit

给 LLM agent 用的「原文优先 + 事后打标」长期记忆核心。

它不替你调模型。它只负责：**原文先落、状态可追踪、标完才进索引、查不到就拒答**。模型调用留在你的适配器里，所以换模型不用改核心。

## 它解决什么

普通 RAG 是「先切块、先嵌入、后检索」，问题是：

- 切块时不知道后面发生了什么；
- 情绪、关系、语气在向量里很淡；
- 会话崩溃就丢；
- 标错了没法重标。

这个包换了个顺序：

```
原文逐条落盘 → 会话结束/空闲时由当时的模型打标 → 校验 → 落库 → 建索引 → 查询
```

原文永远先留着；情绪是**后标的**，但标的时候模型还在语境里。

## 快速开始

```js
import {
  configure, appendRaw, commitSettlement, markTagged, validateSettlement,
} from 'memory-settle-kit';

configure({
  rawDir: './data/raw',
  settlementsDir: './data/settlements',
  focusNames: ['Alice', 'Bob'],   // 你的角色表；留空则不限
  actionWords: ['hug', 'apologize'], // 可选：防止 scenes 全是动作
});

appendRaw('session-1', 'user', '今天谢谢你');
appendRaw('session-1', 'ai', '不客气');

// 你的模型在会话结束时返回 rounds（见 docs/USAGE.md）
const result = commitSettlement({
  sessionId: 'session-1',
  transcript: [
    { id: 'q001', role: 'user', text: '今天谢谢你' },
    { id: 'q002', role: 'ai', text: '不客气' },
  ],
  rounds: [{
    id: 'R01', span: ['q001', 'q002'], title: '道谢', scope: 'family',
    p_codes: ['H009-2'], c_codes: ['H009-2'],
    entities: ['道谢', '今天'], focus: 'Alice',
    participants: ['Alice', 'Bob'], scenes: ['日常'], short: true,
  }],
  autoIndex: false,
});
console.log(result.ok, result.path);
```

## 核心概念

- **原文层**：每轮追加，不依赖打标成功。
- **状态**：`pending / tagged`，`confidence: high|low`，`version`。
- **打标**：模型按话题切轮，写 P/C 情绪码、实体、focus、scenes。
- **P/C**：P 是表面情绪，C 是结合语境的真实姿态；检索优先 C。
- **灰色库**：不想记的轮写 `skipped: true + reason`，只做文本查找，不进情绪索引。
- **低置信**：崩溃后补标、分块补标一律 `low`，查询时降权。
- **静默窗**：收尾后一段时间不主动搭话；持久化在 `quiet.json`。
- **暂停**：`暂停记忆` / `暂停收尾` / `继续记忆`，状态在 `control.json`。

## 文档

- [基本原理](docs/PRINCIPLES.md)
- [使用方法](docs/USAGE.md)
- [暂停词与收尾词](docs/PAUSE-WORDS.md)
- [注意事项](docs/CAVEATS.md)
- [数据格式](docs/SCHEMA.md)

## 适配器

核心不绑定模型、不绑定 IM。你只需要实现三件事：

1. 每轮把 user / assistant 原文 `appendRaw`；
2. 会话结束/空闲时调你的模型，把结果交给 `commitSettlement`；
3. 查询时用你自己的检索层，或参考 `adapters/minimal.mjs`。

`adapters/` 里有最小示例，不包含任何个人配置。

## 适用边界

- 标注质量取决于**打标时模型是否还在语境里**；旁读/补标只能算低置信。
- 情绪码是判断，不是事实；事实不确定时不要写。
- 落库文件默认明文，自己决定加密、ACL、保留期。
- 提示词是中文的；换语言要同步改 `triggers.mjs` 和打标提示。

MIT License.
