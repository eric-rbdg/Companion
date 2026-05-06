import type { IRateLimiter } from "./rate-limiter.interface.js";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export class InMemoryRateLimiter implements IRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  constructor(private readonly config: RateLimitConfig) {}

  async consume(key: string): Promise<{ allowed: boolean }> {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;

    let timestamps = this.buckets.get(key) ?? [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= this.config.max) {
      this.buckets.set(key, timestamps);
      return { allowed: false };
    }

    timestamps.push(now);
    this.buckets.set(key, timestamps);
    return { allowed: true };
  }
}
