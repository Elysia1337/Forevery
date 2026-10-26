# memory-settle-kit

Raw-first, emotion-tagged long-term memory for LLM agents.

The core never calls a model. It stores raw turns, tracks `pending/tagged`, validates settlement JSON, and only indexes tagged rounds. Your adapter owns model calls, so swapping models does not change storage or validation.

## Flow

```
append raw turns → settle when the session ends/idles → validate → commit
→ index → retrieve
```

## Quick start

```js
import { configure, appendRaw, commitSettlement } from 'memory-settle-kit';

configure({ rawDir: './data/raw', settlementsDir: './data/settlements', focusNames: ['Alice','Bob'] });
appendRaw('s1', 'user', 'thanks');
appendRaw('s1', 'ai', 'welcome');

commitSettlement({
  sessionId: 's1',
  transcript: [
    { id: 'q001', role: 'user', text: 'thanks' },
    { id: 'q002', role: 'ai', text: 'welcome' },
  ],
  rounds: [{
    id: 'R01', span: ['q001','q002'], title: 'thanks', scope: 'family', short: true,
    p_codes: ['H009-2'], c_codes: ['H009-2'], entities: ['thanks','today'],
    focus: 'Alice', participants: ['Alice','Bob'], scenes: ['daily'],
  }],
  autoIndex: false,
});
```

## Docs

Chinese docs are canonical: [`README.md`](README.md), [`docs/`](docs/).
- [`PRINCIPLES.md`](docs/PRINCIPLES.md)
- [`USAGE.md`](docs/USAGE.md)
- [`PAUSE-WORDS.md`](docs/PAUSE-WORDS.md)
- [`CAVEATS.md`](docs/CAVEATS.md)

MIT.
