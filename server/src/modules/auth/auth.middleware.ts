import type { Request, RequestHandler, Response } from 'express';
import type { PublicUser } from '@life-admin/shared';
import { config } from '../../config';
import { parseCookies } from '../../lib/cookies';
import { UnauthorizedError } from '../../lib/errors';
import type { AuthService, IssuedSession } from './auth.service';

export function setSessionCookie(res: Response, session: Pick<IssuedSession, 'token' | 'expiresAt'>): void {
  res.cookie(config.session.cookieName, session.token, {
    httpOnly: true, // not readable from JavaScript (mitigates XSS token theft)
    sameSite: 'lax', // not sent on cross-site POST/PATCH/DELETE (CSRF)
    secure: config.session.secureCookie,
    path: '/',
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.session.secureCookie,
    path: '/',
  });
}

/**
 * Runs on every API request. If a valid session cookie is present,
 * attaches req.user / req.sessionId. Never rejects — use requireAuth for that.
 */
export function sessionMiddleware(auth: AuthService): RequestHandler {
  return (req, res, next) => {
    const token = parseCookies(req.headers.cookie)[config.session.cookieName];
    if (!token) return next();

    const result = auth.authenticate(token);
    if (!result) {
      // Expired or revoked: drop the stale cookie.
      clearSessionCookie(res);
      return next();
    }
    req.user = result.session.user;
    req.sessionId = result.session.id;
    if (result.renewedExpiry) setSessionCookie(res, { token, expiresAt: result.renewedExpiry });
    next();
  };
}

/** Rejects the request with 401 unless it has a valid session. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : new UnauthorizedError());
};

/** The authenticated user. Only call behind requireAuth. */
export function currentUser(req: Request): PublicUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
