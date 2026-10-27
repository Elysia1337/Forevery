import test from 'node:test';
import assert from 'node:assert/strict';
import { ERRORS, MemoryError, fromValidation, normalizeError } from '../src/errors.mjs';

test('error codes', () => {
  const e = new MemoryError(ERRORS.E_VALIDATION, 'bad', { details: ['x'] });
  assert.equal(e.code, 'E_VALIDATION');
  assert.equal(e.details[0], 'x');
  assert.equal(fromValidation({ ok: false, errors: ['x'] }).code, 'E_VALIDATION');
  assert.equal(normalizeError(new Error('io')).code, 'E_IO');
});
