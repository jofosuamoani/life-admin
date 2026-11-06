import fs from 'node:fs';
import path from 'node:path';
import { backup, type DatabaseSync } from 'node:sqlite';

const PREFIX = 'life-admin-';
const SUFFIX = '.db';

interface BackupOptions {
  dir: string;
  /** How many snapshots to keep; older ones are deleted. */
  keep: number;
  intervalMs: number;
}

/** Snapshot files, oldest first (names sort by time). */
function listBackups(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
    .sort();
}

/**
 * Writes a consistent copy of the live database using SQLite's online
 * backup API (safe while the app is reading and writing, unlike copying the
 * file), then deletes snapshots beyond `keep`.
 */
export async function backupDatabase(db: DatabaseSync, { dir, keep }: Pick<BackupOptions, 'dir' | 'keep'>): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-'); // 2026-11-05T03-00-00-000Z
  const file = path.join(dir, `${PREFIX}${stamp}${SUFFIX}`);
  const tmp = `${file}.partial`;
  await backup(db, tmp);
  fs.renameSync(tmp, file); // only complete snapshots ever carry the .db name

  const all = listBackups(dir);
  for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(dir, old));
  return file;
}

/**
 * Takes a snapshot once every `intervalMs`. Also checks at startup, because
 * on Fly the machine may be stopped when idle and a plain 24h timer might
 * never fire: if the newest snapshot is older than the interval, one is
 * taken immediately.
 */
export function scheduleBackups(db: DatabaseSync, options: BackupOptions): void {
  const run = () =>
    backupDatabase(db, options)
      .then((file) => console.log(`[backup] wrote ${path.basename(file)}`))
      .catch((err) => console.error('[backup] failed', err));

  const newest = listBackups(options.dir).at(-1);
  const newestAt = newest ? fs.statSync(path.join(options.dir, newest)).mtimeMs : 0;
  const dueIn = Math.max(0, newestAt + options.intervalMs - Date.now());

  setTimeout(() => {
    void run();
    setInterval(() => void run(), options.intervalMs).unref();
  }, dueIn).unref();
}
