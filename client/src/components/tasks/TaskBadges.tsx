import type { Task, TaskCategory, TaskPriority } from '@life-admin/shared';
import { formatDue, formatShortDate } from '../../lib/dates';
import type { DueStatus } from '../../lib/tasks';
import { AlertIcon, CalendarIcon, ClockIcon, FlagIcon } from '../ui/Icons';

export function categoryClass(category: TaskCategory): string {
  return `cat-${category.toLowerCase()}`;
}

export function CategoryBadge({ category }: { category: TaskCategory }) {
  return (
    <span className={`badge badge-category ${categoryClass(category)}`}>
      <span className="badge-dot" aria-hidden="true" />
      {category}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`badge badge-priority pri-${priority.toLowerCase()}`} title={`${priority} priority`}>
      <FlagIcon width={12} height={12} />
      {priority}
      <span className="visually-hidden"> priority</span>
    </span>
  );
}

const DUE_ICON: Record<DueStatus, typeof CalendarIcon> = {
  overdue: AlertIcon,
  today: ClockIcon,
  soon: CalendarIcon,
  later: CalendarIcon,
  none: CalendarIcon,
  done: CalendarIcon,
};

function label(task: Task, status: DueStatus, today: string): string {
  if (status === 'today') return 'Due today';
  // Completed tasks show the plain date: "3 days overdue" no longer applies.
  if (status === 'done') return task.dueDate ? `Due ${formatShortDate(task.dueDate, today)}` : 'No due date';
  return formatDue(task.dueDate, today);
}

export function DueLabel({ task, status, today }: { task: Task; status: DueStatus; today: string }) {
  const Icon = DUE_ICON[status];
  return (
    <span className={`due due-${status}`}>
      <Icon width={13} height={13} />
      {label(task, status, today)}
    </span>
  );
}
