import { useCallback, useEffect, useState } from 'react';
import { formatWait } from '@life-admin/shared';
import { ApiError } from '../api/http';

/**
 * Live "Too many attempts. Try again in 12 minutes." message for a
 * rate-limited form. It counts down every second and disappears once
 * the wait is over.
 */
export function useRateLimitNotice() {
  const [limit, setLimit] = useState<{ reason: string; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!limit) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= limit.until) setLimit(null);
    }, 1000);
    return () => clearInterval(id);
  }, [limit]);

  /** Shows the notice if `err` is a rate-limit response. Returns whether it was one. */
  const showIfRateLimited = useCallback((err: unknown): boolean => {
    const rl = err instanceof ApiError ? err.rateLimit : null;
    if (!rl) return false;
    const t = Date.now();
    setNow(t);
    setLimit({ reason: rl.reason, until: t + rl.retryAfterSeconds * 1000 });
    return true;
  }, []);

  const clear = useCallback(() => setLimit(null), []);

  const message =
    limit && now < limit.until ? `${limit.reason} Please try again in ${formatWait((limit.until - now) / 1000)}.` : null;

  return { message, showIfRateLimited, clear };
}
