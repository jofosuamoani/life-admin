import type { Task } from '@life-admin/shared';
import TaskItem from './TaskItem';

export default function TaskList({ tasks, label }: { tasks: Task[]; label?: string }) {
  return (
    <ul className="task-list" aria-label={label}>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
