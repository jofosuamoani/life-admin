import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
  type Task,
} from '@life-admin/shared';
import { NotFoundError } from '../../lib/errors';
import type { TaskRepository } from './task.repository';

/**
 * Business logic for tasks. Validates untrusted input and delegates
 * persistence to the repository. Future features (e.g. an AI assistant
 * creating tasks from emails) should call this service rather than the
 * repository so validation and rules stay in one place.
 *
 * Every method requires the acting user's id. It comes from the
 * authenticated session, never from the request body or URL.
 */
export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  list(userId: number, rawQuery: unknown): Task[] {
    return this.repo.list(userId, taskQuerySchema.parse(rawQuery ?? {}));
  }

  get(userId: number, id: number): Task {
    const task = this.repo.findById(userId, id);
    // Same 404 for "doesn't exist" and "belongs to someone else", so ids can't be probed.
    if (!task) throw new NotFoundError(`Task ${id} not found`);
    return task;
  }

  create(userId: number, rawInput: unknown): Task {
    return this.repo.create(userId, createTaskSchema.parse(rawInput));
  }

  update(userId: number, id: number, rawPatch: unknown): Task {
    // The schema only allows task fields, so id / user_id in the body are stripped.
    const patch = updateTaskSchema.parse(rawPatch);
    const task = this.repo.update(userId, id, patch);
    if (!task) throw new NotFoundError(`Task ${id} not found`);
    return task;
  }

  delete(userId: number, id: number): void {
    if (!this.repo.delete(userId, id)) throw new NotFoundError(`Task ${id} not found`);
  }
}
