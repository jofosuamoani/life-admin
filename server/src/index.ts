import { createApp } from './app';
import { config } from './config';
import { scheduleBackups } from './db/backup';
import { closeDb, getDb } from './db/connection';
import { seedDemoData } from './db/seed';

const db = getDb();
const { app, modules } = createApp(db);

if (config.seedDemoData) await seedDemoData(modules.auth.users, modules.tasks.repository);

// Housekeeping: remove expired sessions at startup and hourly.
modules.auth.service.pruneExpiredSessions();
setInterval(() => modules.auth.service.pruneExpiredSessions(), 60 * 60 * 1000).unref();

if (config.backups.enabled) scheduleBackups(db, config.backups);

if (config.isProduction && config.trustProxy === false) {
  console.warn('[server] TRUST_PROXY is not set. Behind a proxy, all users will share one IP for rate limiting.');
}
if (config.signup.mode !== 'open') {
  const detail = config.signup.mode === 'allowlist' ? ` (${config.signup.allowedEmails.size} invited emails)` : '';
  console.log(`[server] sign-ups: ${config.signup.mode}${detail}`);
}

const server = app.listen(config.port, () => {
  const what = config.serveClient ? 'Life Admin' : 'Life Admin API';
  console.log(`[server] ${what} listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
