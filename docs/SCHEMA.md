# 数据格式

## settlement

```json
{
  "version": "1.0",
  "session_id": "session-1",
  "revision": 1,
  "settled_at": "2026-01-01T00:00:00.000Z",
  "settled_by": "agent",
  "in_context": true,
  "micro": false,
  "confidence": "high",
  "start": "q001",
  "end": "q020",
  "rounds": [],
  "quality": { "turns": 20, "rounds": 3, "coverage": "full", "confidence": "high" }
}
```

## round

```json
{
  "id": "R01",
  "span": ["q001", "q008"],
  "title": "一句话标题",
  "scope": "family | work | knowledge | mixed",
  "p_codes": ["H013-2"],
  "c_codes": ["H013-2"],
  "entities": ["实体1", "实体2"],
  "focus": "Alice",
  "participants": ["Alice", "Bob"],
  "scenes": ["身份", "承诺"],
  "mixed": false,
  "short": false
}
```

skipped：

```json
{ "id": "R03", "span": ["q017","q020"], "title": "寒暄", "scope": "family",
  "skipped": true, "reason": "没有想留的东西" }
```

## 码

- `p_codes` / `c_codes`：0–2 个；
- 除 `Z000` 外带强度 `-1..-5`；
- 例：`H013-2`。

## 状态

```json
{ "session_id": "session-1", "status": "pending|tagged",
  "confidence": "high|low|null", "version": 1, "updated_at": "..." }
```
