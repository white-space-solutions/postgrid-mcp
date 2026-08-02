const LIST_LIMIT_PER_MIN = 10;
const WINDOW_MS = 60_000;

export class RateLimitedError extends Error {
  retryAfterSec: number;
  constructor(retryAfterSec: number) {
    super(`PostGrid list rate limit: retry after ${retryAfterSec}s`);
    this.name = "RateLimitedError";
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * In-process throttle for PostGrid list calls. On Vercel Fluid Compute,
 * instances are reused across requests, so this bounds bursts per instance.
 * Returns immediately if a slot is available; otherwise throws RateLimitedError.
 */
const memoryBuckets: number[] = [];

export async function acquireListPermit(): Promise<void> {
  const now = Date.now();
  while (memoryBuckets.length && memoryBuckets[0]! < now - WINDOW_MS) {
    memoryBuckets.shift();
  }
  if (memoryBuckets.length >= LIST_LIMIT_PER_MIN) {
    const retryAfterSec = Math.ceil(
      (memoryBuckets[0]! + WINDOW_MS - now) / 1000
    );
    throw new RateLimitedError(Math.max(1, retryAfterSec));
  }
  memoryBuckets.push(now);
}

export function resetMemoryRateLimit(): void {
  memoryBuckets.length = 0;
}
