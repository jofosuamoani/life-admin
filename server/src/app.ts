import cors from 'cors';
import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { originCheck } from './middleware/originCheck';
import { securityHeaders } from './middleware/securityHeaders';
import { serveClient } from './middleware/serveClient';
import { createAuthModule, sessionMiddleware } from './modules/auth';
import { createTasksModule } from './modules/tasks';

/**
 * Builds the Express app. Each feature lives in src/modules/<name> and
 * exposes a router; future modules (inbox, calendar, documents,
 * assistant) get mounted here the same way, behind requireAuth.
 */
export function createApp(db: DatabaseSync) {
  const app = express();

  app.disable('x-powered-by');
  // Must be set before anything reads req.ip (e.g. the login rate limiters).
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders({ hsts: config.isProduction }));
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  // In development the API can also be called directly on its own port.
  app.use(
    originCheck(config.isProduction ? [config.clientOrigin] : [config.clientOrigin, `http://localhost:${config.port}`]),
  );
  app.use(express.json({ limit: '1mb' }));

  const auth = createAuthModule(db);
  const tasks = createTasksModule(db);

  // Resolves the session cookie (if any) into req.user for every request.
  app.use(sessionMiddleware(auth.service));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', auth.router);
  app.use('/api/tasks', tasks.router); // router applies requireAuth

  // Production: the same server serves the web app (any non-/api GET).
  if (config.serveClient) app.use(serveClient(config.clientDist));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, modules: { auth, tasks } };
}
