import { Router, type Request } from 'express';
import { clientIp, rateLimit } from '../../middleware/rateLimit';
import type { AuthService } from './auth.service';
import { clearSessionCookie, currentUser, requireAuth, setSessionCookie } from './auth.middleware';

/**
 * REST endpoints:
 *   POST /api/auth/signup   { name, email, password } → 201 user (sets session cookie)
 *   POST /api/auth/login    { email, password }       → 200 user (sets session cookie)
 *   POST /api/auth/logout                             → 204 (clears cookie, revokes session)
 *   GET  /api/auth/me                                 → 200 user | 401
 *
 * Account (signed in):
 *   PATCH  /api/auth/me        { name?, email?, currentPassword? } → 200 user
 *   DELETE /api/auth/me        { password }                        → 204 (account and its data deleted)
 *   PUT    /api/auth/password  { currentPassword, newPassword }    → 200 { otherSessionsEnded } (new cookie)
 *   GET    /api/auth/sessions                                      → 200 SessionInfo[]
 *   DELETE /api/auth/sessions                                      → 200 { ended } (all other devices)
 *   DELETE /api/auth/sessions/:id                                  → 204 (one other device)
 */
export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  // Login limits (only failed attempts count):
  // 1. Per IP: 50 / 15 min. Stops one machine trying many accounts
  //    (password spraying / credential stuffing). Checked first, so an
  //    attacker can't fill memory with per-email counters.
  // 2. Per IP + email: 5 / 15 min. Stops guessing one account's password.
  //    Pairing with the IP means nobody can lock a victim out by
  //    failing logins against their email from somewhere else.
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const loginIpLimiter = rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    max: 50,
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts from this network.',
  });
  const loginAccountLimiter = rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    max: 5,
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts for this account.',
    keyGenerator: (req) => {
      const raw = (req.body as { email?: unknown } | undefined)?.email;
      // Normalise like the login schema does, so "Alice@X.com " and "alice@x.com" share a counter.
      const email = typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 254) : '';
      return `${clientIp(req)}|${email}`;
    },
  });
  // 10 signup attempts per IP per hour. Every attempt counts: successful ones
  // (mass account creation) and rejected ones (probing which emails exist).
  const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many sign-up attempts.',
  });

  // Actions that re-check the password while signed in: 10 failures per account
  // per 15 minutes, so a stolen session can't be used to guess the password.
  const reauthLimiter = rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    max: 10,
    skipSuccessfulRequests: true,
    message: 'Too many incorrect password attempts.',
    keyGenerator: (req) => `user:${req.user?.id}`,
  });
  const userAgent = (req: Request) => req.get('user-agent') ?? '';

  router.post('/signup', signupLimiter, async (req, res) => {
    const { user, session } = await auth.signup(req.body, userAgent(req));
    // Replace any session the browser already had.
    auth.logout(req.sessionId);
    setSessionCookie(res, session);
    res.status(201).json(user);
  });

  router.post('/login', loginIpLimiter, loginAccountLimiter, async (req, res) => {
    const { user, session } = await auth.login(req.body, userAgent(req));
    auth.logout(req.sessionId);
    setSessionCookie(res, session);
    res.json(user);
  });

  router.post('/logout', (req, res) => {
    auth.logout(req.sessionId);
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json(currentUser(req));
  });

  router.patch('/me', requireAuth, reauthLimiter, async (req, res) => {
    res.json(await auth.updateProfile(currentUser(req).id, req.body));
  });

  router.delete('/me', requireAuth, reauthLimiter, async (req, res) => {
    await auth.deleteAccount(currentUser(req).id, req.body);
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.put('/password', requireAuth, reauthLimiter, async (req, res) => {
    const { session, otherSessionsEnded } = await auth.changePassword(
      currentUser(req).id,
      req.sessionId,
      req.body,
      userAgent(req),
    );
    setSessionCookie(res, session);
    res.json({ otherSessionsEnded });
  });

  router.get('/sessions', requireAuth, (req, res) => {
    res.json(auth.listSessions(currentUser(req).id, req.sessionId));
  });

  router.delete('/sessions', requireAuth, (req, res) => {
    res.json({ ended: auth.revokeOtherSessions(currentUser(req).id, req.sessionId) });
  });

  router.delete('/sessions/:id', requireAuth, (req, res) => {
    auth.revokeSession(currentUser(req).id, req.sessionId, String(req.params.id));
    res.status(204).end();
  });

  return router;
}
