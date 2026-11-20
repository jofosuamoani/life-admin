import type { Task, TaskPriority } from '@life-admin/shared';
import { daysUntil } from './dates';

const PRIORITY_RANK: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

type Compare = (a: Task, b: Task) => number;

/**
 * Earliest due date first (`sign` -1 flips that); tasks without one always go last,
 * whichever direction.
 */
const byDueDate = (a: Task, b: Task, sign = 1): number => {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return (a.dueDate < b.dueDate ? -1 : 1) * sign;
};
const byPriority: Compare = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
const byCreated: Compare = (a, b) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id;
const titleCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Ways the Tasks page can order its list. `due` is the default (and the server's order). */
export type TaskSort = 'due' | 'priority' | 'added' | 'title';

/**
 * Each sort has a natural direction (the first label) and a reversed one (the second).
 * `ascending` says which way the natural direction runs, for the arrow icon.
 */
export const TASK_SORTS: { value: TaskSort; label: string; directions: [string, string]; ascending: boolean }[] = [
  { value: 'due', label: 'Due date', directions: ['Soonest first', 'Latest first'], ascending: true },
  { value: 'priority', label: 'Priority', directions: ['Highest first', 'Lowest first'], ascending: false },
  { value: 'added', label: 'Date added', directions: ['Newest first', 'Oldest first'], ascending: false },
  { value: 'title', label: 'Title', directions: ['A to Z', 'Z to A'], ascending: true },
];

export function isTaskSort(v: string | null): v is TaskSort {
  return TASK_SORTS.some((s) => s.value === v);
}

/** Primary key, flipped by `sign` when reversed; the tie-breakers keep their natural order. */
const COMPARE: Record<TaskSort, (a: Task, b: Task, sign: number) => number> = {
  due: (a, b, sign) => byDueDate(a, b, sign) || byPriority(a, b),
  priority: (a, b, sign) => byPriority(a, b) * sign || byDueDate(a, b),
  added: (a, b, sign) => byCreated(b, a) * sign,
  title: (a, b, sign) => titleCollator.compare(a.title, b.title) * sign || byDueDate(a, b),
};

/**
 * Sorts a copy of `tasks`. Open tasks always come before completed ones (so the "All" tab stays
 * readable), then the chosen order, then id so ties are stable. `reversed` flips the chosen
 * order, except that tasks without a due date stay last.
 * The default (`due`, not reversed) mirrors the server: due date (none last), then priority.
 */
export function sortTasks(tasks: Task[], sort: TaskSort = 'due', reversed = false): Task[] {
  const compare = COMPARE[sort];
  const sign = reversed ? -1 : 1;
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return compare(a, b, sign) || a.id - b.id;
  });
}

/**
 * Where an open task stands relative to today. Completed tasks are always 'done'.
 *   overdue  → due before today
 *   today    → due today
 *   soon     → due in the next 7 days (excluding today)
 *   later    → due after that
 *   none     → no due date
 */
export type DueStatus = 'done' | 'overdue' | 'today' | 'soon' | 'later' | 'none';

export const SOON_WINDOW_DAYS = 7;

export function dueStatus(task: Task, today?: string): DueStatus {
  if (task.completed) return 'done';
  if (!task.dueDate) return 'none';
  const d = daysUntil(task.dueDate, today);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= SOON_WINDOW_DAYS) return 'soon';
  return 'later';
}

export function isOverdue(task: Task, today?: string): boolean {
  return dueStatus(task, today) === 'overdue';
}
