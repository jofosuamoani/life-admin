/**
 * Remembers, per user and per browser, whether they had any tasks last time,
 * so the dashboard can show a loading placeholder that matches what's coming
 * (stat cards for a full account, a plain card for an empty one) instead of
 * flashing the full layout before the welcome screen.
 *
 * Stores only "has tasks: yes/no", never task data. localStorage can be
 * unavailable (private mode, blocked storage), so every access is guarded and
 * a missing value just means "unknown".
 */
const key = (userId: number) => `la:hasTasks:${userId}`;

export type TaskCountHint = 'some' | 'none' | 'unknown';

export function readTaskCountHint(userId: number): TaskCountHint {
  try {
    const v = localStorage.getItem(key(userId));
    return v === 'some' || v === 'none' ? v : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function writeTaskCountHint(userId: number, hasTasks: boolean): void {
  try {
    localStorage.setItem(key(userId), hasTasks ? 'some' : 'none');
  } catch {
    // Storage unavailable: the hint is only a nicety.
  }
}
