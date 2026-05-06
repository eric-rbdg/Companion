/**
 * Rate limiting behind an interface so production can swap in Redis-backed storage
 * (same API, distributed limits across instances).
 */
export interface IRateLimiter {
  consume(key: string): Promise<{ allowed: boolean }>;
}
