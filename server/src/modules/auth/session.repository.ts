import type { DatabaseSync } from 'node:sqlite';
import type { PublicUser } from '@life-admin/shared';

export interface SessionWithUser {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  userAgent: string;
  user: PublicUser;
}

export interface SessionRow {
  /** SHA-256 hash of the cookie token (the primary key). */
  id: string;
  userAgent: string;
  createdAt: string;
  lastUsedAt: string;
}

/**
 * Sessions are listed and revoked by a public id: the first 16 hex characters
 * (64 bits) of the stored token hash. That is unique enough within one user's
 * sessions, every lookup is also scoped by user, and a hash prefix can't be
 * turned back into a token. So the client never sees the full key.
 */
export const PUBLIC_ID_LENGTH = 16;
export const publicSessionId = (id: string) => id.slice(0, PUBLIC_ID_LENGTH);

/** Stores sessions keyed by the SHA-256 hash of the cookie token. */
export class SessionRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(id: string, userId: number, expiresAt: Date, userAgent: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, last_used_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, userId, now, expiresAt.toISOString(), userAgent, now);
  }

  /** Returns the session and its user, or null if missing or expired. */
  findValid(id: string, now: Date = new Date()): SessionWithUser | null {
    const row = this.db
      .prepare(
        `SELECT s.id, s.created_at AS session_created_at, s.expires_at, s.last_used_at, s.user_agent,
                u.id AS user_id, u.name, u.email, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > ?`,
      )
      .get(id, now.toISOString()) as
      | {
          id: string;
          session_created_at: string;
          expires_at: string;
          last_used_at: string | null;
          user_agent: string;
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
      lastUsedAt: row.last_used_at ?? row.session_created_at,
      userAgent: row.user_agent,
      user: { id: row.user_id, name: row.name, email: row.email, createdAt: row.created_at },
    };
  }

  /** The user's unexpired sessions, most recently used first. */
  listForUser(userId: number, now: Date = new Date()): SessionRow[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_agent, created_at, COALESCE(last_used_at, created_at) AS last_used_at
         FROM sessions WHERE user_id = ? AND expires_at > ?
         ORDER BY last_used_at DESC`,
      )
      .all(userId, now.toISOString()) as {
      id: string;
      user_agent: string;
      created_at: string;
      last_used_at: string;
    }[];
    return rows.map((r) => ({ id: r.id, userAgent: r.user_agent, createdAt: r.created_at, lastUsedAt: r.last_used_at }));
  }

  extend(id: string, expiresAt: Date): void {
    this.db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expiresAt.toISOString(), id);
  }

  touch(id: string, at: Date = new Date()): void {
    this.db.prepare('UPDATE sessions SET last_used_at = ? WHERE id = ?').run(at.toISOString(), id);
  }

  /** Records the browser for a session created before devices were tracked. */
  setUserAgent(id: string, userAgent: string): void {
    this.db.prepare("UPDATE sessions SET user_agent = ? WHERE id = ? AND user_agent = ''").run(userAgent, id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  /** Revokes one of the user's sessions by its public id. Returns whether one was deleted. */
  deleteByPublicId(userId: number, publicId: string): boolean {
    const result = this.db
      .prepare('DELETE FROM sessions WHERE user_id = ? AND substr(id, 1, ?) = ?')
      .run(userId, PUBLIC_ID_LENGTH, publicId);
    return Number(result.changes) > 0;
  }

  /** Revokes all of the user's sessions except `keepId` (if given). Returns how many. */
  deleteAllForUser(userId: number, keepId?: string): number {
    const result = this.db
      .prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
      .run(userId, keepId ?? '');
    return Number(result.changes);
  }

  deleteExpired(now: Date = new Date()): number {
    return Number(this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes);
  }
}
