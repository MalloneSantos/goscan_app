// Simple, deterministic-enough idempotency key generator for pilot tests.
// (We’ll enrich with deviceId, endpoint, etc., later.)
export function generateIdempotencyKey(prefix = "gocs"): string {
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now();
  return `${prefix}:${ts}-${rand}`;
}
