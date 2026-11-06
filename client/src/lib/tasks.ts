import type { Task, TaskPriority } from '@life-admin/shared';
import { daysUntil } from './dates';

const PRIORITY_RANK: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

/** Mirrors the server ordering: open first, then due date (none last), then priority. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return a.id - b.id;
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
