import { createHash, randomBytes } from 'node:crypto';
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  signupSchema,
  updateProfileSchema,
  type PublicUser,
  type SessionInfo,
} from '@life-admin/shared';
import { config } from '../../config';
import { HttpError, NotFoundError, UnauthorizedError } from '../../lib/errors';
import { getDummyHash, hashPassword, verifyPassword } from '../../lib/password';
import { describeDevice, USER_AGENT_MAX_LENGTH } from '../../lib/userAgent';
import { toPublicUser, type UserRepository } from './user.repository';
import { publicSessionId, type SessionRepository, type SessionWithUser } from './session.repository';

/** How often a session's "last active" time is written (not on every request). */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const EMAIL_TAKEN = 'An account with this email already exists';

/**
 * A wrong password while signed in is a 400 on that field, not a 401: a 401
 * means "your session ended" and would sign the user out of the app.
 */
function wrongPassword(field: string): HttpError {
  return new HttpError(400, 'Incorrect password', [{ path: field, message: 'Incorrect password' }]);
}

const isUniqueViolation = (err: unknown) => String((err as Error)?.message).includes('UNIQUE');

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

  async signup(raw: unknown, userAgent = ''): Promise<{ user: PublicUser; session: IssuedSession }> {
    const input = signupSchema.parse(raw);
    // Checked before the "already registered" check, so people who aren't
    // invited can't use signup to probe which emails have accounts.
    const { mode, allowedEmails } = config.signup;
    if (mode === 'closed') throw new HttpError(403, 'Sign-ups are closed right now.');
    if (mode === 'allowlist' && !allowedEmails.has(input.email.toLowerCase())) {
      throw new HttpError(403, 'Sign-ups are invite-only, and this email isn’t on the invite list.');
    }
    if (this.users.findByEmail(input.email)) {
      throw new HttpError(409, EMAIL_TAKEN);
    }
    const passwordHash = await hashPassword(input.password);
    let user;
    try {
      user = this.users.create({ name: input.name, email: input.email, passwordHash });
    } catch (err) {
      // Two concurrent signups with the same email: the UNIQUE constraint wins.
      if (isUniqueViolation(err)) throw new HttpError(409, EMAIL_TAKEN);
      throw err;
    }
    return { user: toPublicUser(user), session: this.createSession(user.id, userAgent) };
  }

  async login(raw: unknown, userAgent = ''): Promise<{ user: PublicUser; session: IssuedSession }> {
    const input = loginSchema.parse(raw);
    const user = this.users.findByEmail(input.email);

    // Always run a hash comparison so timing doesn't reveal whether the email exists.
    const valid = await verifyPassword(input.password, user?.passwordHash || (await getDummyHash()));
    if (!user || !valid) throw new UnauthorizedError('Invalid email or password');

    return { user: toPublicUser(user), session: this.createSession(user.id, userAgent) };
  }

  /** Changes name and/or email. A new email needs the current password. */
  async updateProfile(userId: number, raw: unknown): Promise<PublicUser> {
    const input = updateProfileSchema.parse(raw);
    const user = this.requireUser(userId);

    const emailChanged = input.email !== undefined && input.email !== user.email.toLowerCase();
    if (emailChanged) {
      if (!input.currentPassword) {
        throw new HttpError(400, 'Enter your password to change your email', [
          { path: 'currentPassword', message: 'Enter your password to change your email' },
        ]);
      }
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw wrongPassword('currentPassword');
      if (this.users.findByEmail(input.email!)) throw new HttpError(409, EMAIL_TAKEN);
    }

    try {
      return toPublicUser(
        this.users.updateProfile(userId, { name: input.name, email: emailChanged ? input.email : undefined }),
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, EMAIL_TAKEN);
      throw err;
    }
  }

  /**
   * Changes the password, then signs out every other device and gives this
   * one a fresh session token: if the password was changed because the
   * account was compromised, no old session (including a stolen copy of this
   * one) keeps working.
   */
  async changePassword(
    userId: number,
    currentSessionId: string | undefined,
    raw: unknown,
    userAgent = '',
  ): Promise<{ session: IssuedSession; otherSessionsEnded: number }> {
    const input = changePasswordSchema.parse(raw);
    const user = this.requireUser(userId);
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw wrongPassword('currentPassword');

    this.users.setPasswordHash(userId, await hashPassword(input.newPassword));
    const otherSessionsEnded = this.sessions.deleteAllForUser(userId, currentSessionId);
    if (currentSessionId) this.sessions.delete(currentSessionId);
    return { session: this.createSession(userId, userAgent), otherSessionsEnded };
  }

  /** Permanently deletes the account with all its tasks and sessions. */
  async deleteAccount(userId: number, raw: unknown): Promise<void> {
    const input = deleteAccountSchema.parse(raw);
    const user = this.requireUser(userId);
    if (!(await verifyPassword(input.password, user.passwordHash))) throw wrongPassword('password');
    this.users.delete(userId);
  }

  listSessions(userId: number, currentSessionId: string | undefined): SessionInfo[] {
    return this.sessions.listForUser(userId).map((s) => ({
      id: publicSessionId(s.id),
      device: describeDevice(s.userAgent),
      current: s.id === currentSessionId,
      createdAt: s.createdAt,
      lastActiveAt: s.lastUsedAt,
    }));
  }

  /** Signs out one of the user's other devices. */
  revokeSession(userId: number, currentSessionId: string | undefined, publicId: string): void {
    if (currentSessionId && publicSessionId(currentSessionId) === publicId) {
      throw new HttpError(400, 'Use Log out to end the session on this device');
    }
    if (!/^[0-9a-f]+$/.test(publicId) || !this.sessions.deleteByPublicId(userId, publicId)) {
      throw new NotFoundError('That device is already signed out');
    }
  }

  /** Signs out every device except this one. Returns how many were signed out. */
  revokeOtherSessions(userId: number, currentSessionId: string | undefined): number {
    return this.sessions.deleteAllForUser(userId, currentSessionId);
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
  authenticate(token: string, userAgent = ''): { session: SessionWithUser; renewedExpiry: Date | null } | null {
    const session = this.sessions.findValid(hashToken(token));
    if (!session) return null;
    // Sessions from before device tracking: fill in the browser on first use.
    if (!session.userAgent && userAgent) {
      this.sessions.setUserAgent(session.id, userAgent.slice(0, USER_AGENT_MAX_LENGTH));
    }

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
        this.sessions.touch(session.id);
        return { session, renewedExpiry: expiresAt };
      }
    }
    // Keep "last active" roughly current without a write on every request.
    if (now - Date.parse(session.lastUsedAt) > TOUCH_INTERVAL_MS) this.sessions.touch(session.id);
    return { session, renewedExpiry: null };
  }

  pruneExpiredSessions(): number {
    return this.sessions.deleteExpired();
  }

  private requireUser(userId: number) {
    const user = this.users.findById(userId);
    // The session was valid a moment ago, so the account was just deleted elsewhere.
    if (!user) throw new UnauthorizedError();
    return user;
  }

  private createSession(userId: number, userAgent: string): IssuedSession {
    // 256 bits of randomness; a fresh token on every login prevents session fixation.
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + config.session.ttlMs);
    this.sessions.create(hashToken(token), userId, expiresAt, userAgent.slice(0, USER_AGENT_MAX_LENGTH));
    return { token, expiresAt };
  }
}
