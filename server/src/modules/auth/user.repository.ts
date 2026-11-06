import type { DatabaseSync } from 'node:sqlite';
import type { PublicUser } from '@life-admin/shared';

/** Internal user record. passwordHash must never leave the server. */
export interface UserRecord extends PublicUser {
  passwordHash: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

export function toPublicUser({ id, name, email, createdAt }: UserRecord | PublicUser): PublicUser {
  return { id, name, email, createdAt };
}

export class UserRepository {
  constructor(private readonly db: DatabaseSync) {}

  findById(id: number): UserRecord | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow | undefined;
    return row ? toRecord(row) : null;
  }

  /** Case-insensitive (the column is COLLATE NOCASE). */
  findByEmail(email: string): UserRecord | null {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as
      | UserRow
      | undefined;
    return row ? toRecord(row) : null;
  }

  create(input: { name: string; email: string; passwordHash: string }): UserRecord {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO users (name, email, password_hash, created_at, updated_at)
         VALUES (:name, :email, :passwordHash, :now, :now)`,
      )
      .run({ ...input, now });
    return this.findById(Number(result.lastInsertRowid))!;
  }

  setPasswordHash(id: number, passwordHash: string): void {
    this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, new Date().toISOString(), id);
  }
}
