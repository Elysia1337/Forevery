import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkHealth } from '../src/health.mjs';

test('health on empty root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forevery-health-'));
  const h = checkHealth(root);
  assert.equal(h.ok, true);
});
