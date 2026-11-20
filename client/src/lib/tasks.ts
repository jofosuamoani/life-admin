import type { Task, TaskPriority } from '@life-admin/shared';
import { daysUntil } from './dates';

const PRIORITY_RANK: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

type Compare = (a: Task, b: Task) => number;

/** Earliest due date first; tasks without one go last. */
const byDueDate: Compare = (a, b) => {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
};
const byPriority: Compare = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
const titleCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Ways the Tasks page can order its list. `due` is the default (and the server's order). */
export type TaskSort = 'due' | 'priority' | 'newest' | 'oldest' | 'title';

export const TASK_SORTS: { value: TaskSort; label: string }[] = [
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title', label: 'Title' },
];

export function isTaskSort(v: string | null): v is TaskSort {
  return TASK_SORTS.some((s) => s.value === v);
}

const COMPARE: Record<TaskSort, Compare> = {
  due: (a, b) => byDueDate(a, b) || byPriority(a, b),
  priority: (a, b) => byPriority(a, b) || byDueDate(a, b),
  newest: (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id),
  oldest: (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id),
  title: (a, b) => titleCollator.compare(a.title, b.title) || byDueDate(a, b),
};

/**
 * Sorts a copy of `tasks`. Open tasks always come before completed ones (so the "All" tab stays
 * readable), then the chosen order, then id so ties are stable.
 * The default (`due`) mirrors the server: due date (none last), then priority.
 */
export function sortTasks(tasks: Task[], sort: TaskSort = 'due'): Task[] {
  const compare = COMPARE[sort];
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return compare(a, b) || a.id - b.id;
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
