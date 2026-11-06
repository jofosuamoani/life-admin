import { Router } from 'express';
import { clientIp, rateLimit } from '../../middleware/rateLimit';
import type { AuthService } from './auth.service';
import { clearSessionCookie, currentUser, requireAuth, setSessionCookie } from './auth.middleware';

/**
 * REST endpoints:
 *   POST /api/auth/signup   { name, email, password } → 201 user (sets session cookie)
 *   POST /api/auth/login    { email, password }       → 200 user (sets session cookie)
 *   POST /api/auth/logout                             → 204 (clears cookie, revokes session)
 *   GET  /api/auth/me                                 → 200 user | 401
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

  router.post('/signup', signupLimiter, async (req, res) => {
    const { user, session } = await auth.signup(req.body);
    // Replace any session the browser already had.
    auth.logout(req.sessionId);
    setSessionCookie(res, session);
    res.status(201).json(user);
  });

  router.post('/login', loginIpLimiter, loginAccountLimiter, async (req, res) => {
    const { user, session } = await auth.login(req.body);
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

  return router;
}
