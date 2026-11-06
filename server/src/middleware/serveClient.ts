import fs from 'node:fs';
import path from 'node:path';
import express, { type RequestHandler } from 'express';

/**
 * Serves the built web app (client/dist) so the app and the API share one
 * origin. That's what the session cookie (SameSite=Lax, __Host-) and the CSRF
 * origin check are designed around.
 *
 * - /assets/* have content hashes in their names → cached for a year.
 * - Any other GET that isn't /api is a client-side route (/tasks, /login, …)
 *   → index.html, never cached, so a deploy takes effect on the next load.
 */
export function serveClient(distDir: string): express.Router {
  const indexHtml = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error(`Built web app not found at ${indexHtml}. Run \`npm run build\` first.`);
  }

  const assets = express.static(path.join(distDir, 'assets'), {
    immutable: true,
    maxAge: '365d',
    index: false,
  });
  const files = express.static(distDir, { index: false, maxAge: '1h' });

  const spaFallback: RequestHandler = (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path === '/api' || req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  };

  const router = express.Router();
  // A missing hashed asset (e.g. an old tab after a deploy) is a plain 404, not index.html.
  router.use('/assets', assets, (_req, res) => {
    res.status(404).end();
  });
  router.use(files);
  router.use(spaFallback);
  return router;
}
