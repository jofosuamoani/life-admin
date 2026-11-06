import type { DatabaseSync } from 'node:sqlite';
import { SqliteTaskRepository } from './task.repository';
import { TaskService } from './task.service';
import { createTaskRouter } from './task.routes';

/** Wires up the tasks module (repository → service → router). */
export function createTasksModule(db: DatabaseSync) {
  const repository = new SqliteTaskRepository(db);
  const service = new TaskService(repository);
  const router = createTaskRouter(service);
  return { repository, service, router };
}

export type { TaskRepository } from './task.repository';
export { TaskService } from './task.service';
