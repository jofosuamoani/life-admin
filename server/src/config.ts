import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Express `trust proxy` setting, from TRUST_PROXY. Set this only when the
 * server runs behind a reverse proxy / load balancer, so req.ip is the real
 * client IP (read from X-Forwarded-For) instead of the proxy's.
 *   unset          → false: ignore X-Forwarded-For (correct with no proxy)
 *   "1", "2", …    → trust that many proxy hops
 *   "loopback", "10.0.0.0/8", "uniquelocal", … → trust those proxy addresses
 * "true" is rejected: it trusts X-Forwarded-For from anyone, letting
 * clients fake their IP and bypass rate limits.
 */
function parseTrustProxy(raw: string | undefined): false | number | string {
  if (!raw || raw === 'false') return false;
  if (raw === 'true') {
    throw new Error('TRUST_PROXY=true is unsafe (clients could spoof their IP). Use a hop count like 1, or proxy addresses.');
  }
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

/**
 * In production the site's public origin must be given explicitly: it's what
 * CORS and the CSRF origin check allow, so a wrong default would either
 * break every write or allow the wrong site.
 */
function parseClientOrigin(raw: string | undefined): string {
  // On Fly.io the app's default address follows from its name (set by Fly at runtime),
  // so CLIENT_ORIGIN only needs setting for a custom domain.
  if (!raw && process.env.FLY_APP_NAME) raw = `https://${process.env.FLY_APP_NAME}.fly.dev`;
  if (!raw) {
    if (isProduction) throw new Error('CLIENT_ORIGIN must be set in production (e.g. https://life-admin.fly.dev).');
    return 'http://localhost:5173';
  }
  const url = new URL(raw);
  // localhost is allowed over http so the production build can be tried locally.
  if (isProduction && url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('CLIENT_ORIGIN must use https:// in production.');
  }
  return url.origin; // normalises away any trailing slash or path
}

export type SignupMode = 'open' | 'allowlist' | 'closed';

/**
 * Who may create an account.
 *   SIGNUP_ALLOWED_EMAILS="a@x.com,b@y.com" → only those emails (invite-only)
 *   SIGNUP_OPEN=true                        → anyone
 *   neither                                 → open in development, closed in production
 */
function parseSignup(): { mode: SignupMode; allowedEmails: ReadonlySet<string> } {
  const allowedEmails = new Set(
    (process.env.SIGNUP_ALLOWED_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowedEmails.size > 0) return { mode: 'allowlist', allowedEmails };
  if (process.env.SIGNUP_OPEN === 'true' || (!isProduction && process.env.SIGNUP_OPEN !== 'false')) {
    return { mode: 'open', allowedEmails };
  }
  return { mode: 'closed', allowedEmails };
}

const databasePath = process.env.DATABASE_PATH ?? path.join(serverRoot, 'data', 'life-admin.db');
const secureCookie = process.env.SECURE_COOKIES ? process.env.SECURE_COOKIES === 'true' : isProduction;
const clientDist = path.resolve(serverRoot, '..', 'client', 'dist');

/**
 * Centralised runtime configuration. Future integration secrets
 * (Gmail, Calendar, LLM API keys, ...) should be added here and read
 * from environment variables — never hard-coded.
 */
export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: parseClientOrigin(process.env.CLIENT_ORIGIN),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  databasePath,
  /** Creates a demo account with example tasks. Never enabled in production. */
  seedDemoData: !isProduction && process.env.SEED_DEMO_DATA !== 'false',
  signup: parseSignup(),
  /**
   * Serve the built web app (client/dist) from this server, so the app and
   * /api share one origin. On in production; in development Vite serves it.
   */
  serveClient: process.env.SERVE_CLIENT ? process.env.SERVE_CLIENT === 'true' : isProduction,
  clientDist,
  backups: {
    /** Nightly database snapshots. On in production unless BACKUPS=false. */
    enabled: process.env.BACKUPS ? process.env.BACKUPS === 'true' : isProduction,
    dir: process.env.BACKUP_DIR ?? path.join(path.dirname(databasePath), 'backups'),
    keep: Number(process.env.BACKUP_KEEP ?? 14),
    intervalMs: 24 * 60 * 60 * 1000,
  },
  session: {
    /**
     * With HTTPS the `__Host-` prefix makes browsers enforce Secure, Path=/
     * and no Domain, so a sibling subdomain can't set or overwrite it.
     */
    cookieName: secureCookie ? '__Host-la_session' : 'la_session',
    /** Sessions last 30 days and are extended on use once past the halfway point. */
    ttlMs: 30 * 24 * 60 * 60 * 1000,
    /** Hard cap: however often it's used, a session ends 90 days after login. */
    maxLifetimeMs: 90 * 24 * 60 * 60 * 1000,
    /** Secure cookies require HTTPS; enabled automatically in production. */
    secureCookie,
  },
} as const;
