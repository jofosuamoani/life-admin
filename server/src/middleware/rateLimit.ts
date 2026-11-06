import type { Request, RequestHandler } from 'express';
import { formatWait, type RateLimitDetails } from '@life-admin/shared';
import { HttpError } from '../lib/errors';

interface Options {
  windowMs: number;
  max: number;
  /** Why the request was blocked. The remaining wait time is appended automatically. */
  message?: string;
  /**
   * Only count requests that fail (status >= 400), e.g. wrong passwords.
   * Requests rejected with 429 by another limiter don't count either:
   * no password was checked, so they aren't real attempts.
   */
  skipSuccessfulRequests?: boolean;
  /**
   * What to count by. Defaults to the client IP (req.ip, which honours the
   * `trust proxy` setting, so it's the real client IP behind a trusted proxy).
   */
  keyGenerator?: (req: Request) => string;
}

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/**
 * Small in-memory fixed-window rate limiter.
 * Used to slow down password guessing and abuse on the auth endpoints.
 * (State is per-process and resets on restart; a multi-instance deployment
 * would need a shared store such as Redis or a database table.)
 */
export function rateLimit({
  windowMs,
  max,
  message = 'Too many attempts.',
  skipSuccessfulRequests = false,
  keyGenerator = clientIp,
}: Options): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      const details: RateLimitDetails = { reason: message, retryAfterSeconds };
      next(new HttpError(429, `${message} Please try again in ${formatWait(retryAfterSeconds)}.`, details));
      return;
    }

    // Count the attempt up front so concurrent requests can't slip past the limit.
    entry.count += 1;
    if (skipSuccessfulRequests) {
      const counted = entry;
      res.on('finish', () => {
        if (res.statusCode < 400 || res.statusCode === 429) counted.count = Math.max(0, counted.count - 1);
      });
    }
    next();
  };
}
