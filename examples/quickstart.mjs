// Ten-minute quickstart: append raw, commit a mock settlement, read the card.
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '../adapters/file-store.mjs';
import { mockModel, basicRounds, basicTranscript } from '../adapters/mock-model.mjs';
import { configure, readContinuity } from '../src/index.mjs';

const root = path.join(os.tmpdir(), 'forevery-quickstart');
const store = new FileStore(root);
configure({ focusNames: ['Alice', 'Bob'] });
store.append('demo', 'user', 'hello');
store.append('demo', 'ai', 'hi');
const rounds = (await mockModel(basicRounds())()).rounds;
const r = store.commit({
  sessionId: 'demo', transcript: basicTranscript(), rounds,
  continuityKey: 'demo', autoIndex: false,
});
console.log('committed:', r.ok, r.path);
console.log('state:', store.state('demo'));
console.log('card:\n' + readContinuity('demo'));
console.log('data dir:', root);
