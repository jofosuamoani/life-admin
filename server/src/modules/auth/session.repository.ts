import type { DatabaseSync } from 'node:sqlite';
import type { PublicUser } from '@life-admin/shared';

export interface SessionWithUser {
  id: string;
  createdAt: string;
  expiresAt: string;
  user: PublicUser;
}

/** Stores sessions keyed by the SHA-256 hash of the cookie token. */
export class SessionRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(id: string, userId: number, expiresAt: Date): void {
    this.db
      .prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(id, userId, new Date().toISOString(), expiresAt.toISOString());
  }

  /** Returns the session and its user, or null if missing or expired. */
  findValid(id: string, now: Date = new Date()): SessionWithUser | null {
    const row = this.db
      .prepare(
        `SELECT s.id, s.created_at AS session_created_at, s.expires_at,
                u.id AS user_id, u.name, u.email, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > ?`,
      )
      .get(id, now.toISOString()) as
      | {
          id: string;
          session_created_at: string;
          expires_at: string;
          user_id: number;
          name: string;
          email: string;
          created_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.session_created_at,
      expiresAt: row.expires_at,
      user: { id: row.user_id, name: row.name, email: row.email, createdAt: row.created_at },
    };
  }

  extend(id: string, expiresAt: Date): void {
    this.db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expiresAt.toISOString(), id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  deleteExpired(now: Date = new Date()): number {
    return Number(this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes);
  }
}
