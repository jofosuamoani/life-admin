import type { CreateTaskInput, Task, TaskQuery, UpdateTaskInput } from '@life-admin/shared';
import { request } from './http';

export const tasksApi = {
  list(query: Partial<TaskQuery> = {}): Promise<Task[]> {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.category) params.set('category', query.category);
    const qs = params.toString();
    return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  get(id: number): Promise<Task> {
    return request<Task>(`/tasks/${id}`);
  },

  create(input: CreateTaskInput): Promise<Task> {
    return request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) });
  },

  update(id: number, patch: UpdateTaskInput): Promise<Task> {
    return request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/tasks/${id}`, { method: 'DELETE' });
  },
};
