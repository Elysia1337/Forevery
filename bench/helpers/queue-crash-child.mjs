// Child process: enqueue, claim, then die without ack.
import { TagQueue } from '../../src/queue.mjs';
const q = new TagQueue(process.argv[2], { leaseMs: 100, maxAttempts: 3 });
q.enqueue({ sessionId: 'crash-child' });
q.claim();
process.kill(process.pid, 'SIGKILL');
