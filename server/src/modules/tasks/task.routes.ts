import { Router } from 'express';
import { HttpError } from '../../lib/errors';
import { currentUser, requireAuth } from '../auth';
import type { TaskService } from './task.service';

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid task id');
  return id;
}

/**
 * REST endpoints (all require authentication and only touch the caller's tasks):
 *   GET    /api/tasks          ?status=all|open|completed&category=Money
 *   GET    /api/tasks/:id
 *   POST   /api/tasks
 *   PATCH  /api/tasks/:id
 *   DELETE /api/tasks/:id
 */
export function createTaskRouter(service: TaskService): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    res.json(service.list(currentUser(req).id, req.query));
  });

  router.get('/:id', (req, res) => {
    res.json(service.get(currentUser(req).id, parseId(req.params.id)));
  });

  router.post('/', (req, res) => {
    res.status(201).json(service.create(currentUser(req).id, req.body));
  });

  router.patch('/:id', (req, res) => {
    res.json(service.update(currentUser(req).id, parseId(req.params.id), req.body));
  });

  router.delete('/:id', (req, res) => {
    service.delete(currentUser(req).id, parseId(req.params.id));
    res.status(204).end();
  });

  return router;
}
