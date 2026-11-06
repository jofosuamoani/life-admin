/** A date in the user's local timezone as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Parses YYYY-MM-DD as a local date (avoids the UTC off-by-one). */
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `iso` shifted by `days` calendar days, as YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** e.g. "Wednesday, November 4" */
export function formatLongDate(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Whole days from `today` until `iso` (negative if in the past). */
export function daysUntil(iso: string, today: string = todayISO()): number {
  const ms = parseLocal(iso).getTime() - parseLocal(today).getTime();
  return Math.round(ms / 86_400_000);
}

/** e.g. "Nov 25", or "Jan 3, 2027" when not in the current year. */
export function formatShortDate(iso: string, today: string = todayISO()): string {
  const date = parseLocal(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

/** Human-friendly due label for an open task: "Today", "Tomorrow", "3 days overdue", "In 4 days", "Nov 25". */
export function formatDue(iso: string | null, today: string = todayISO()): string {
  if (!iso) return 'No due date';
  const diff = daysUntil(iso, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${-diff} ${diff === -1 ? 'day' : 'days'} overdue`;
  if (diff < 7) return `In ${diff} days`;
  return formatShortDate(iso, today);
}

/** Time-of-day greeting for the given time. */
export function greetingFor(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
