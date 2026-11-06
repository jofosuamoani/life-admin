import type { PublicUser } from '@life-admin/shared';

declare global {
  namespace Express {
    interface Request {
      /** Set by the session middleware when the request carries a valid session. */
      user?: PublicUser;
      /** Hashed id of the current session (never the raw cookie token). */
      sessionId?: string;
    }
  }
}

export {};
