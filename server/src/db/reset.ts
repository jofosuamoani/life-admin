/**
 * Deletes the local database file and re-creates it (including the demo
 * account in development).
 * Usage: npm run db:reset
 */
import fs from 'node:fs';
import { config } from '../config';
import { closeDb, getDb } from './connection';
import { seedDemoData } from './seed';
import { UserRepository } from '../modules/auth';
import { SqliteTaskRepository } from '../modules/tasks/task.repository';

for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(config.databasePath + suffix, { force: true });
}

const db = getDb();
if (config.seedDemoData) await seedDemoData(new UserRepository(db), new SqliteTaskRepository(db));
closeDb();
console.log(`[db] reset complete: ${config.databasePath}`);
