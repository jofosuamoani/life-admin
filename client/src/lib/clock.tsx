import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { todayISO } from './dates';

const ClockContext = createContext<Date>(new Date());

/** True if both dates fall in the same local hour of the same day. */
function sameHour(a: Date, b: Date): boolean {
  return a.getHours() === b.getHours() && todayISO(a) === todayISO(b);
}

/**
 * Provides a shared "current time" that keeps time-sensitive UI (greeting,
 * "Today"/"Overdue" labels, dashboard counts) correct while the app stays open.
 *
 * Checks every minute, on the minute, and whenever the tab becomes visible
 * again. It only publishes a new value when the hour or date changes, so
 * consumers re-render at most about once an hour.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const next = new Date();
        return sameHour(prev, next) ? prev : next;
      });

    let interval: number | undefined;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, msToNextMinute);

    // Timers are throttled in background tabs and paused during sleep,
    // so re-check as soon as the user comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, []);

  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>;
}

/** Current time, accurate to the hour. */
export function useNow(): Date {
  return useContext(ClockContext);
}

/** Today's local date as YYYY-MM-DD; updates at midnight. */
export function useToday(): string {
  return todayISO(useNow());
}
