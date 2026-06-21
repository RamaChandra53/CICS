/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * Note: This is per-process. In a multi-instance deployment, use a Redis-backed
 * rate limiter instead. For a single-server setup this is sufficient.
 *
 * Usage:
 *   const limiter = new RateLimiter({ windowMs: 60_000, max: 30 });
 *   const result = limiter.check(ip);
 *   if (!result.allowed) return 429 response;
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window per key */
  max: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export class RateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly store = new Map<string, RateLimitRecord>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;

    // Periodically clean up expired entries to prevent memory leaks
    // Only start the interval in environments where setInterval is available
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs * 2);
    }
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now >= record.resetAt) {
      // Start a new window
      record = { count: 1, resetAt: now + this.windowMs };
      this.store.set(key, record);
      return {
        allowed: true,
        remaining: this.max - 1,
        resetAt: record.resetAt,
        limit: this.max,
      };
    }

    record.count += 1;
    const allowed = record.count <= this.max;
    return {
      allowed,
      remaining: Math.max(0, this.max - record.count),
      resetAt: record.resetAt,
      limit: this.max,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

/**
 * Extract the real client IP from a Next.js request.
 * Respects X-Forwarded-For (from proxies/CDN) when present.
 */
export function getClientIp(request: Request): string {
  const forwarded = (request as { headers: { get: (h: string) => string | null } }).headers.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For: client, proxy1, proxy2 — take the first (leftmost) IP
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
