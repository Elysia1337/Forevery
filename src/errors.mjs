// Stable error codes for adapters/SDKs. The core keeps returning {ok:false, errors} for validation.
export const ERRORS = {
  E_VALIDATION: 'E_VALIDATION',
  E_SESSION: 'E_SESSION',
  E_IDEMPOTENT: 'E_IDEMPOTENT',
  E_IO: 'E_IO',
  E_QUEUE_EMPTY: 'E_QUEUE_EMPTY',
  E_QUEUE_DEAD: 'E_QUEUE_DEAD',
};

export class MemoryError extends Error {
  constructor(code, message, { cause, details, retryable = false } = {}) {
    super(message, { cause });
    this.name = 'MemoryError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export function memoryError(code, message, options) { return new MemoryError(code, message, options); }

export function fromValidation(result) {
  if (!result || result.ok) return null;
  return new MemoryError(ERRORS.E_VALIDATION, 'settlement validation failed', { details: result.errors || [] });
}

export function normalizeError(err) {
  if (err instanceof MemoryError) return err;
  return new MemoryError(ERRORS.E_IO, err?.message || String(err), { cause: err, retryable: false });
}
