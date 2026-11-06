import type { RequestHandler } from 'express';
import { HttpError } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (the session cookie is already SameSite=Lax).
 * Browsers always send an Origin header on cross-origin state-changing
 * requests, so rejecting unknown origins blocks forged requests from
 * other sites. Requests without an Origin (curl, server-to-server) are
 * allowed; they still need a valid session cookie.
 */
export function originCheck(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (SAFE_METHODS.has(req.method) || !origin || allowed.has(origin)) {
      next();
      return;
    }
    next(new HttpError(403, 'Request origin not allowed'));
  };
}
