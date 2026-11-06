import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CreateTaskInput, Task } from '@life-admin/shared';
import { tasksApi } from '../../api/tasks';
import { ApiError, errorMessage } from '../../api/http';
import { useCurrentUser } from '../../lib/auth';
import { readTaskCountHint, writeTaskCountHint } from '../../lib/taskCountHint';
import { sortTasks } from '../../lib/tasks';
import { useToast } from '../../lib/toast';
import { useOnReturn } from '../../lib/useOnReturn';
import ConfirmDialog from '../ui/ConfirmDialog';
import TaskFormDialog from './TaskFormDialog';

type LoadStatus = 'loading' | 'ready' | 'error';

interface TasksContextValue {
  tasks: Task[];
  status: LoadStatus;
  loadError: string | null;
  /**
   * While loading: true if this user had tasks last time on this device, so
   * pages can show a placeholder that matches (no full layout flashing before
   * an empty state). False when they had none, or it's unknown.
   */
  expectTasks: boolean;
  reload: () => void;
  /** Opens the shared "New task" dialog. */
  openCreate: () => void;
  /** Opens the shared "Edit task" dialog. */
  openEdit: (task: Task) => void;
  /** Asks for confirmation, then deletes. */
  requestDelete: (task: Task) => void;
  /** Optimistically toggles completion (with Undo when completing). */
  toggleTask: (task: Task) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

type Editor = { mode: 'create' } | { mode: 'edit'; task: Task } | null;

/**
 * Single source of task data for the signed-in area, shared by the
 * Dashboard and Tasks pages (no refetch or flicker when switching pages).
 *
 * Mounted inside the authenticated layout, so it's torn down on logout:
 * one user's tasks can never linger in memory for the next user.
 *
 * It also owns the one create/edit dialog and the one delete confirmation,
 * instead of every task row rendering its own.
 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const userId = useCurrentUser().id;
  const [expectTasks] = useState(() => readTaskCountHint(userId) === 'some');

  // Keep the hint current for the next visit.
  const hasTasks = tasks.length > 0;
  useEffect(() => {
    if (status === 'ready') writeTaskCountHint(userId, hasTasks);
  }, [status, hasTasks, userId]);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      setTasks(await tasksApi.list());
      setStatus('ready');
    } catch (err) {
      setLoadError(errorMessage(err, "We couldn't load your tasks."));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Bumped on every local change, so a background refresh that started
  // before the change can't overwrite it with an older list.
  const localWrites = useRef(0);

  // When the user comes back to the tab, quietly pick up changes made in
  // another tab or device. No skeleton, and failures are ignored: the data on
  // screen stays usable, and an ended session is handled by the 401 handler.
  useOnReturn(
    () => {
      const startedAt = localWrites.current;
      tasksApi
        .list()
        .then((fresh) => {
          if (localWrites.current !== startedAt) return;
          setTasks(fresh);
          setLoadError(null);
          setStatus('ready');
        })
        .catch(() => {});
    },
    { enabled: status !== 'loading' },
  );

  const upsert = useCallback((task: Task) => {
    localWrites.current++;
    setTasks((prev) =>
      sortTasks(prev.some((t) => t.id === task.id) ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]),
    );
  }, []);

  const removeLocal = useCallback((id: number) => {
    localWrites.current++;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTask = useCallback(
    async function toggle(task: Task) {
      const completed = !task.completed;
      upsert({ ...task, completed });
      try {
        const saved = await tasksApi.update(task.id, { completed });
        upsert(saved);
        if (completed) toast('Task completed', { action: { label: 'Undo', onClick: () => void toggle(saved) } });
      } catch (err) {
        upsert(task); // roll back
        if (err instanceof ApiError && err.status === 404) {
          removeLocal(task.id);
          toast('That task no longer exists.', { tone: 'error' });
        } else {
          toast(errorMessage(err, "Couldn't update the task. Please try again."), { tone: 'error' });
        }
      }
    },
    [upsert, removeLocal, toast],
  );

  /** Called by the form dialog. Throws on validation errors so the form can show them. */
  const saveTask = useCallback(
    async (input: CreateTaskInput) => {
      if (editor?.mode === 'edit') {
        try {
          upsert(await tasksApi.update(editor.task.id, input));
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            removeLocal(editor.task.id);
            setEditor(null);
            toast('That task no longer exists.', { tone: 'error' });
            return;
          }
          throw err;
        }
        toast('Changes saved');
      } else {
        upsert(await tasksApi.create(input));
        toast('Task created');
      }
      setEditor(null);
    },
    [editor, upsert, removeLocal, toast],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await tasksApi.remove(pendingDelete.id);
      removeLocal(pendingDelete.id);
      toast('Task deleted');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) removeLocal(pendingDelete.id);
      else toast(errorMessage(err, "Couldn't delete the task. Please try again."), { tone: 'error' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, removeLocal, toast]);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      status,
      loadError,
      expectTasks,
      reload: () => void load(),
      openCreate: () => setEditor({ mode: 'create' }),
      openEdit: (task) => setEditor({ mode: 'edit', task }),
      requestDelete: (task) => setPendingDelete(task),
      toggleTask: (task) => void toggleTask(task),
    }),
    [tasks, status, loadError, expectTasks, load, toggleTask],
  );

  return (
    <TasksContext.Provider value={value}>
      {children}
      <TaskFormDialog
        open={editor !== null}
        task={editor?.mode === 'edit' ? editor.task : undefined}
        onSubmit={saveTask}
        onClose={() => setEditor(null)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete task?"
        message={
          pendingDelete && (
            <>
              <strong>“{pendingDelete.title}”</strong> will be permanently deleted. This can’t be undone.
            </>
          )
        }
        confirmLabel="Delete task"
        tone="danger"
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>');
  return ctx;
}
