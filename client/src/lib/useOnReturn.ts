import { useEffect, useRef } from 'react';

/** How long the user must be away before returning counts. Quick tab flips do nothing. */
export const RETURN_MIN_AWAY_MS = 60_000;

/**
 * Calls `onReturn` when the user comes back to the app after being away
 * for at least `minAwayMs`: switching back from another tab or app, or
 * waking the computer.
 *
 * "Away" starts when the tab is hidden or the window loses focus, whichever
 * comes first, and ends when it's visible and focused again. Each absence
 * triggers at most one call.
 */
export function useOnReturn(onReturn: () => void, { enabled = true, minAwayMs = RETURN_MIN_AWAY_MS } = {}): void {
  const callback = useRef(onReturn);
  callback.current = onReturn;

  useEffect(() => {
    if (!enabled) return;
    let leftAt: number | null = null;

    const leave = () => {
      if (leftAt === null) leftAt = Date.now();
    };
    const back = () => {
      if (document.visibilityState !== 'visible' || leftAt === null) return;
      const awayFor = Date.now() - leftAt;
      leftAt = null;
      if (awayFor >= minAwayMs) callback.current();
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : back());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', leave);
    window.addEventListener('focus', back);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', back);
    };
  }, [enabled, minAwayMs]);
}
