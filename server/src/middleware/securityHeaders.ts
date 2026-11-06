import type { RequestHandler } from 'express';

/**
 * Content Security Policy for the built app. Everything is served from our
 * own origin, and Vite's production build has no inline scripts or styles.
 * React applies `style={...}` through the DOM (CSSOM), which CSP allows, so
 * `style-src 'self'` doesn't need 'unsafe-inline'.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * Security headers, set by hand (no helmet dependency for a dozen lines).
 * HSTS is only sent in production, where the site is HTTPS-only; sending
 * it from localhost would pin HTTPS on the dev machine.
 */
export function securityHeaders({ hsts }: { hsts: boolean }): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY'); // older browsers; CSP frame-ancestors covers modern ones
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    if (hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}
