import type { CreateTaskInput, Task } from '@life-admin/shared';
import Modal from '../ui/Modal';
import TaskForm from './TaskForm';

interface Props {
  open: boolean;
  /** Present when editing; absent when creating. */
  task?: Task;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  onClose: () => void;
}

export default function TaskFormDialog({ open, task, onSubmit, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description={task ? undefined : 'What do you need to take care of?'}
    >
      <TaskForm initial={task} onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  );
}
