import type { Task } from '@life-admin/shared';
import { useToday } from '../../lib/clock';
import { dueStatus } from '../../lib/tasks';
import { CheckIcon, PencilIcon, TrashIcon } from '../ui/Icons';
import { CategoryBadge, DueLabel, PriorityBadge } from './TaskBadges';
import { useTasks } from './TasksProvider';

export default function TaskItem({ task }: { task: Task }) {
  const { toggleTask, openEdit, requestDelete } = useTasks();
  const today = useToday();
  const status = dueStatus(task, today);

  return (
    <li className={`task-item due-${status}${task.completed ? ' completed' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        className="checkbox"
        onClick={() => toggleTask(task)}
        aria-label={task.completed ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      >
        <CheckIcon width={13} height={13} strokeWidth={3} />
      </button>

      <div className="task-body">
        <button type="button" className="task-title" onClick={() => openEdit(task)} title="Edit task">
          {task.title}
        </button>
        <div className="task-meta">
          <DueLabel task={task} status={status} today={today} />
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => openEdit(task)}
          aria-label={`Edit “${task.title}”`}
          title="Edit"
        >
          <PencilIcon width={16} height={16} />
        </button>
        <button
          type="button"
          className="icon-button danger"
          onClick={() => requestDelete(task)}
          aria-label={`Delete “${task.title}”`}
          title="Delete"
        >
          <TrashIcon width={16} height={16} />
        </button>
      </div>
    </li>
  );
}
