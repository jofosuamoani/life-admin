import { createHash, randomBytes } from 'node:crypto';
import { loginSchema, signupSchema, type PublicUser } from '@life-admin/shared';
import { config } from '../../config';
import { HttpError, UnauthorizedError } from '../../lib/errors';
import { getDummyHash, hashPassword, verifyPassword } from '../../lib/password';
import { toPublicUser, type UserRepository } from './user.repository';
import type { SessionRepository, SessionWithUser } from './session.repository';

export interface IssuedSession {
  /** Raw token for the cookie. Only its hash is stored. */
  token: string;
  expiresAt: Date;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
  ) {}

  async signup(raw: unknown): Promise<{ user: PublicUser; session: IssuedSession }> {
    const input = signupSchema.parse(raw);
    // Checked before the "already registered" check, so people who aren't
    // invited can't use signup to probe which emails have accounts.
    const { mode, allowedEmails } = config.signup;
    if (mode === 'closed') throw new HttpError(403, 'Sign-ups are closed right now.');
    if (mode === 'allowlist' && !allowedEmails.has(input.email.toLowerCase())) {
      throw new HttpError(403, 'Sign-ups are invite-only, and this email isn’t on the invite list.');
    }
    if (this.users.findByEmail(input.email)) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const passwordHash = await hashPassword(input.password);
    let user;
    try {
      user = this.users.create({ name: input.name, email: input.email, passwordHash });
    } catch (err) {
      // Two concurrent signups with the same email: the UNIQUE constraint wins.
      if (String((err as Error).message).includes('UNIQUE')) {
        throw new HttpError(409, 'An account with this email already exists');
      }
      throw err;
    }
    return { user: toPublicUser(user), session: this.createSession(user.id) };
  }

  async login(raw: unknown): Promise<{ user: PublicUser; session: IssuedSession }> {
    const input = loginSchema.parse(raw);
    const user = this.users.findByEmail(input.email);

    // Always run a hash comparison so timing doesn't reveal whether the email exists.
    const valid = await verifyPassword(input.password, user?.passwordHash || (await getDummyHash()));
    if (!user || !valid) throw new UnauthorizedError('Invalid email or password');

    return { user: toPublicUser(user), session: this.createSession(user.id) };
  }

  logout(sessionId: string | undefined): void {
    if (sessionId) this.sessions.delete(sessionId);
  }

  /**
   * Resolves a cookie token to its session.
   *
   * Two limits apply:
   * - Inactivity: sessions last 30 days, and are extended on use once past
   *   the halfway point (sliding expiry).
   * - Absolute: extensions never go beyond 90 days after the session was
   *   created, so even a constantly used session requires a fresh login.
   *
   * `renewedExpiry` tells the caller to re-send the cookie with the new expiry.
   */
  authenticate(token: string): { session: SessionWithUser; renewedExpiry: Date | null } | null {
    const session = this.sessions.findValid(hashToken(token));
    if (!session) return null;

    const now = Date.now();
    const hardLimit = Date.parse(session.createdAt) + config.session.maxLifetimeMs;
    if (now >= hardLimit) {
      // Defence in depth: expires_at is already capped, but never trust it alone.
      this.sessions.delete(session.id);
      return null;
    }

    const currentExpiry = Date.parse(session.expiresAt);
    if (currentExpiry - now < config.session.ttlMs / 2) {
      const nextExpiry = Math.min(now + config.session.ttlMs, hardLimit);
      // Once capped at the hard limit there's nothing left to extend.
      if (nextExpiry > currentExpiry) {
        const expiresAt = new Date(nextExpiry);
        this.sessions.extend(session.id, expiresAt);
        return { session, renewedExpiry: expiresAt };
      }
    }
    return { session, renewedExpiry: null };
  }

  pruneExpiredSessions(): number {
    return this.sessions.deleteExpired();
  }

  private createSession(userId: number): IssuedSession {
    // 256 bits of randomness; a fresh token on every login prevents session fixation.
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + config.session.ttlMs);
    this.sessions.create(hashToken(token), userId, expiresAt);
    return { token, expiresAt };
  }
}
