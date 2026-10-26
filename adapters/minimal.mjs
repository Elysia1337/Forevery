// Minimal adapter example. Replace askModel with your own model call.
import { configure, appendRaw, commitSettlement } from '../src/index.mjs';

configure({
  rawDir: './data/raw',
  settlementsDir: './data/settlements',
  focusNames: ['Alice', 'Bob'],
});

async function askModel(transcript) {
  // Your model returns { rounds: [...] } following docs/USAGE.md.
  throw new Error('wire your model here');
}

export async function settle(sessionId, transcript) {
  const rounds = await askModel(transcript);
  return commitSettlement({
    sessionId, transcript, rounds,
    settledBy: 'agent', inContext: true, confidence: 'high', autoIndex: false,
  });
}

export function record(sessionId, role, text) {
  appendRaw(sessionId, role, text);
}
