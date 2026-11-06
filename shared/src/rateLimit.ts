/** `details` of a 429 response from the API. */
export interface RateLimitDetails {
  /** Why the request was blocked, without the wait time, e.g. "Too many failed login attempts." */
  reason: string;
  /** Seconds until the limit resets (same value as the Retry-After header). */
  retryAfterSeconds: number;
}

/** Human wait time: "45 seconds", "1 minute", "12 minutes", "1 hour". Rounds up. */
export function formatWait(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  const h = Math.ceil(m / 60);
  return `${h} hour${h === 1 ? '' : 's'}`;
}
