import type { DatabaseSync } from 'node:sqlite';
import {
  createTaskSchema,
  type CreateTaskInput,
  type Task,
  type TaskCategory,
  type TaskPriority,
  type TaskQuery,
} from '@life-admin/shared';

export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Persistence contract for tasks. The service layer depends on this
 * interface, not on SQLite, so storage can be swapped or mocked in tests.
 *
 * DATA ISOLATION: every method is scoped to a userId, and every SQL
 * statement filters on user_id. A task owned by someone else behaves
 * exactly like a task that doesn't exist.
 */
export interface TaskRepository {
  list(userId: number, query?: Partial<TaskQuery>): Task[];
  findById(userId: number, id: number): Task | null;
  create(userId: number, input: CreateTaskInput): Task;
  update(userId: number, id: number, patch: TaskPatch): Task | null;
  delete(userId: number, id: number): boolean;
  count(userId: number): number;
}

interface TaskRow {
  id: number;
  title: string;
  category: string;
  due_date: string | null;
  priority: string;
  completed: number;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    category: row.category as TaskCategory,
    dueDate: row.due_date,
    priority: row.priority as TaskPriority,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteTaskRepository implements TaskRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(userId: number, query: Partial<TaskQuery> = {}): Task[] {
    const where: string[] = ['user_id = :userId'];
    const params: Record<string, string | number> = { userId };

    if (query.status === 'open') where.push('completed = 0');
    if (query.status === 'completed') where.push('completed = 1');
    if (query.category) {
      where.push('category = :category');
      params.category = query.category;
    }

    // Open tasks first, then by due date (no-date last), then priority.
    const sql = `
      SELECT * FROM tasks
      WHERE ${where.join(' AND ')}
      ORDER BY
        completed ASC,
        due_date IS NULL ASC,
        due_date ASC,
        CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC,
        id ASC
    `;
    const rows = this.db.prepare(sql).all(params) as unknown as TaskRow[];
    return rows.map(toTask);
  }

  findById(userId: number, id: number): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as unknown as
      | TaskRow
      | undefined;
    return row ? toTask(row) : null;
  }

  create(userId: number, input: CreateTaskInput): Task {
    const data = createTaskSchema.parse(input);
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO tasks (user_id, title, category, due_date, priority, completed, created_at, updated_at)
         VALUES (:userId, :title, :category, :dueDate, :priority, :completed, :now, :now)`,
      )
      .run({
        userId,
        title: data.title,
        category: data.category,
        dueDate: data.dueDate,
        priority: data.priority,
        completed: data.completed ? 1 : 0,
        now,
      });
    return this.findById(userId, Number(result.lastInsertRowid))!;
  }

  update(userId: number, id: number, patch: TaskPatch): Task | null {
    const existing = this.findById(userId, id);
    if (!existing) return null;

    const next = { ...existing, ...patch };
    this.db
      .prepare(
        `UPDATE tasks
         SET title = :title, category = :category, due_date = :dueDate,
             priority = :priority, completed = :completed, updated_at = :updatedAt
         WHERE id = :id AND user_id = :userId`,
      )
      .run({
        id,
        userId,
        title: next.title,
        category: next.category,
        dueDate: next.dueDate,
        priority: next.priority,
        completed: next.completed ? 1 : 0,
        updatedAt: new Date().toISOString(),
      });
    return this.findById(userId, id);
  }

  delete(userId: number, id: number): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);
    return Number(result.changes) > 0;
  }

  count(userId: number): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ?').get(userId) as { n: number };
    return Number(row.n);
  }
}
