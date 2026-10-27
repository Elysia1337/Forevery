import test from 'node:test';
import assert from 'node:assert/strict';
import { ActivationPool, activationScore, injectScore, decideChannel } from '../src/activation.mjs';

test('activation score and pool', () => {
  assert.equal(activationScore({ relevance: 1, confidence: 1, contextFit: 1, salience: 1, freshness: 1, repetition: 1 }), 1);
  const p = new ActivationPool({ capacity: 2, hot: 1 });
  p.set('a', { relevance: 1 });
  p.set('b', { relevance: 0.5 });
  p.set('c', { relevance: 0.9 });
  assert.equal(p.size, 2);
  assert.equal(p.candidates(1)[0].id, 'a');
});

test('gate channels', () => {
  assert.equal(decideChannel({ score: 0.1, mode: 'focus' }), 'silent');
  assert.equal(decideChannel({ score: 0.5, mode: 'focus' }), 'weak');
  assert.equal(decideChannel({ score: 0.8, mode: 'focus' }), 'strong');
  assert.equal(decideChannel({ score: 0.3, mode: 'companion' }), 'weak');
});

test('inject score', () => {
  const s = injectScore({ relevance: 1, confidence: 1, need: 1, naturalness: 1, interruptionCost: 0, focus: 0 });
  assert.equal(s, 1);
});
