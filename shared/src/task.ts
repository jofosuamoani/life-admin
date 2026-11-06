import { z } from 'zod';

/**
 * Task domain model shared by the client and server.
 * Keeping the source of truth here means the API contract and the UI
 * can never drift apart.
 */

export const TASK_CATEGORIES = [
  'Career',
  'Money',
  'Health',
  'Home',
  'Car',
  'Documents',
  'Personal',
] as const;

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: number;
  title: string;
  category: TaskCategory;
  /** Calendar date in YYYY-MM-DD format, or null if no due date. */
  dueDate: string | null;
  priority: TaskPriority;
  completed: boolean;
  /** ISO-8601 timestamps. */
  createdAt: string;
  updatedAt: string;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Due date is not a valid date');

/** Field rules without defaults, so partial updates never fill in missing fields. */
const taskFields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  category: z.enum(TASK_CATEGORIES),
  dueDate: isoDate.nullable(),
  priority: z.enum(TASK_PRIORITIES),
  completed: z.boolean(),
};

export const createTaskSchema = z.object({
  ...taskFields,
  dueDate: taskFields.dueDate.default(null),
  priority: taskFields.priority.default('Medium'),
  completed: taskFields.completed.default(false),
});

export const updateTaskSchema = z
  .object(taskFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const taskQuerySchema = z.object({
  status: z.enum(['all', 'open', 'completed']).default('all'),
  category: z.enum(TASK_CATEGORIES).optional(),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;
