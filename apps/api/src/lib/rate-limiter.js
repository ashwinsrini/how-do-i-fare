/**
 * Token-bucket rate limiter for external API calls (Jira / GitHub).
 * One instance per credential / provider.
 */
export class TokenBucketLimiter {
  constructor({ maxTokens = 4000, refillRate = 4000, refillIntervalMs = 3600000 }) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefill = Date.now();
    this.lastUsed = Date.now();
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount = Math.floor((elapsed / this.refillIntervalMs) * this.refillRate);
    if (refillAmount > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
      this.lastRefill = now;
    }
  }

  /** Update remaining tokens from response headers */
  updateFromHeaders(headers) {
    const remaining = headers['x-ratelimit-remaining'];
    if (remaining !== undefined) {
      this.tokens = Math.min(this.maxTokens, parseInt(remaining, 10));
    }
  }

  /** Wait until a token is available, then consume one */
  async acquire(maxWaitMs = 60000) {
    this._refill();
    this.lastUsed = Date.now();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    const deadline = Date.now() + maxWaitMs;
    return new Promise((resolve, reject) => {
      const check = () => {
        this._refill();
        if (this.tokens > 0) {
          this.tokens--;
          this.lastUsed = Date.now();
          resolve();
        } else if (Date.now() >= deadline) {
          reject(new Error('Rate limit timeout: could not acquire token'));
        } else {
          setTimeout(check, 1000);
        }
      };
      setTimeout(check, 1000);
    });
  }
}
