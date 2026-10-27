// Optional half-activation layer. In-memory only; never writes the fact layer.
// activation = relevance * confidence * contextFit * salience * freshness * repetition

export const DEFAULT_POOL = { capacity: 50, hot: 5, ttlMs: 10 * 60 * 1000, ttlRounds: 5 };

export class ActivationPool {
  constructor(options = {}) {
    this.options = { ...DEFAULT_POOL, ...options };
    this.entries = new Map();
    this.round = 0;
  }
  nextRound() { this.round += 1; this.decay(); }
  set(id, { relevance = 0.5, confidence = 0.5, contextFit = 1, salience = 1, freshness = 1, repetition = 1 } = {}) {
    const now = Date.now();
    const score = Math.max(0, Math.min(1, relevance * confidence * contextFit * salience * freshness * repetition));
    this.entries.set(String(id), { id: String(id), score, round: this.round, at: now, used: false });
    this.prune();
    return score;
  }
  get(id) { return this.entries.get(String(id)) || null; }
  decay(now = Date.now()) {
    const { ttlMs, ttlRounds } = this.options;
    for (const [id, e] of this.entries) {
      const age = now - e.at;
      const rounds = this.round - e.round;
      if (age > ttlMs || rounds > ttlRounds) this.entries.delete(id);
    }
  }
  prune() {
    if (this.entries.size <= this.options.capacity) return;
    const sorted = [...this.entries.values()].sort((a, b) => b.score - a.score);
    this.entries = new Map(sorted.slice(0, this.options.capacity).map(e => [e.id, e]));
  }
  candidates(limit = this.options.hot) {
    this.decay();
    return [...this.entries.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }
  markUsed(id) { const e = this.get(id); if (e) e.used = true; }
  clear() { this.entries.clear(); this.round = 0; }
  get size() { return this.entries.size; }
}

export function activationScore({ relevance = 0.5, confidence = 0.5, contextFit = 1, salience = 1, freshness = 1, repetition = 1 } = {}) {
  return Math.max(0, Math.min(1, relevance * confidence * contextFit * salience * freshness * repetition));
}

export function injectScore({ relevance = 0.5, confidence = 0.5, need = 0.5, naturalness = 0.5, interruptionCost = 0.5, focus = 0.5 } = {}) {
  return relevance * confidence * need * naturalness - interruptionCost * focus;
}

const THRESHOLDS = {
  focus: { strong: 0.75, weak: 0.45 },
  companion: { strong: 0.55, weak: 0.25 },
  creative: { strong: 0.65, weak: 0.2 },
};

// Returns 'silent' | 'weak' | 'strong'. Silent = ranking/cache only; weak = short anchor; strong = full injection.
export function decideChannel({ score, mode = 'focus' } = {}) {
  const t = THRESHOLDS[mode] || THRESHOLDS.focus;
  if (!Number.isFinite(score)) return 'silent';
  if (score >= t.strong) return 'strong';
  if (score >= t.weak) return 'weak';
  return 'silent';
}
