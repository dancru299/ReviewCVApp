interface HitBucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 10;
const CLEANUP_THRESHOLD = 500;
const buckets = new Map<string, HitBucket>();

function purgeExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  if (buckets.size > CLEANUP_THRESHOLD) purgeExpired(now);

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
    return { allowed: true, remaining: LIMIT - 1, resetAt: bucket.resetAt };
  }

  if (current.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: LIMIT - current.count, resetAt: current.resetAt };
}
