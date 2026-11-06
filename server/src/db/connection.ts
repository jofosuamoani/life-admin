import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config';
import { runMigrations } from './migrations';

let db: DatabaseSync | null = null;

/** Lazily opens (and migrates) the single SQLite connection for the process. */
export function getDb(): DatabaseSync {
  if (db) return db;

  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  restoreIfRequested(config.databasePath);
  db = new DatabaseSync(config.databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(db);
  return db;
}

/**
 * Restore from a backup: if `restore.db` exists next to the database at
 * startup, it replaces the database before anything opens it. The current
 * database is kept as `pre-restore-<time>.db`, so a restore can be undone.
 * (Copy a snapshot to /data/restore.db, then restart the app.)
 */
function restoreIfRequested(databasePath: string): void {
  const dir = path.dirname(databasePath);
  const restore = path.join(dir, 'restore.db');
  if (!fs.existsSync(restore)) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keep = path.join(dir, `pre-restore-${stamp}.db`);
  if (fs.existsSync(databasePath)) {
    fs.renameSync(databasePath, keep);
    // The WAL holds recent writes for the old file; keep it with it.
    for (const ext of ['-wal', '-shm']) {
      if (fs.existsSync(databasePath + ext)) fs.renameSync(databasePath + ext, keep + ext);
    }
  }
  fs.renameSync(restore, databasePath);
  console.log(`[db] restored database from restore.db (previous one saved as ${path.basename(keep)})`);
}

export function closeDb(): void {
  db?.close();
  db = null;
}
