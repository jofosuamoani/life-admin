import type { DatabaseSync } from 'node:sqlite';

/**
 * Minimal forward-only migration runner.
 * Append new migrations to the end of this list — never edit or reorder
 * existing entries once they have shipped. Future modules (emails,
 * calendar events, documents, assistant conversations) add tables here.
 */
const migrations: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: 'create_tasks',
    sql: `
      CREATE TABLE tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        category    TEXT    NOT NULL,
        due_date    TEXT,
        priority    TEXT    NOT NULL DEFAULT 'Medium',
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
      );
      CREATE INDEX idx_tasks_due_date ON tasks (due_date);
      CREATE INDEX idx_tasks_completed ON tasks (completed);
    `,
  },
  {
    id: 2,
    name: 'add_users_sessions_and_task_ownership',
    sql: `
      CREATE TABLE users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      -- id is the SHA-256 hash of the session token; the raw token only
      -- ever lives in the user's cookie.
      CREATE TABLE sessions (
        id         TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX idx_sessions_user_id ON sessions (user_id);
      CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

      -- Tasks created before accounts existed are handed to the dev demo
      -- account. Its password_hash is empty (no login possible) until the
      -- dev seed step sets the demo password. Email must match DEMO_EMAIL in seed.ts.
      INSERT INTO users (name, email, password_hash, created_at, updated_at)
      SELECT 'Demo User', 'demo@lifeadmin.local', '',
             strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE EXISTS (SELECT 1 FROM tasks);

      -- SQLite can't add a NOT NULL foreign key column in place, so rebuild.
      CREATE TABLE tasks_new (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        title       TEXT    NOT NULL,
        category    TEXT    NOT NULL,
        due_date    TEXT,
        priority    TEXT    NOT NULL DEFAULT 'Medium',
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
      );
      INSERT INTO tasks_new (id, user_id, title, category, due_date, priority, completed, created_at, updated_at)
      SELECT id, (SELECT id FROM users WHERE email = 'demo@lifeadmin.local'),
             title, category, due_date, priority, completed, created_at, updated_at
      FROM tasks;
      DROP TABLE tasks;
      ALTER TABLE tasks_new RENAME TO tasks;
      CREATE INDEX idx_tasks_user_listing ON tasks (user_id, completed, due_date);
    `,
  },
];

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: number }[]).map((r) => r.id),
  );
  const record = db.prepare(
    'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
  );

  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      record.run(m.id, m.name, new Date().toISOString());
      db.exec('COMMIT');
      console.log(`[db] applied migration ${m.id}_${m.name}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
