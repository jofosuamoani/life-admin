import type { DatabaseSync } from 'node:sqlite';
import { AuthService } from './auth.service';
import { createAuthRouter } from './auth.routes';
import { SessionRepository } from './session.repository';
import { UserRepository } from './user.repository';

/** Wires up the auth module (repositories → service → router). */
export function createAuthModule(db: DatabaseSync) {
  const users = new UserRepository(db);
  const sessions = new SessionRepository(db);
  const service = new AuthService(users, sessions);
  const router = createAuthRouter(service);
  return { users, sessions, service, router };
}

export { requireAuth, sessionMiddleware, currentUser } from './auth.middleware';
export { UserRepository } from './user.repository';
export type { AuthService } from './auth.service';
