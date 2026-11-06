import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LoginInput, PublicUser, SignupInput } from '@life-admin/shared';
import { authApi } from '../api/auth';
import { NETWORK_ERROR_MESSAGE, setUnauthorizedHandler } from '../api/http';
import { useOnReturn } from './useOnReturn';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Why the user is signed out, which decides where they land after logging in:
 * - 'logout': they clicked Logout → start fresh on the dashboard.
 * - 'session-ended': the server rejected their session mid-use (expired or
 *   revoked) → return them to the page they were on.
 * - null: never signed in during this visit (e.g. opened a bookmark) → return
 *   them to the page they asked for.
 */
export type SignedOutBy = 'logout' | 'session-ended' | null;

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  signedOutBy: SignedOutBy;
  /** Set when the initial session check fails for a reason other than "not logged in". */
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
  /**
   * Resets signedOutBy once the login page has shown its notice, so a later
   * visit to a bookmarked page while signed out returns there after login.
   */
  clearSignedOutBy: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user. On load it asks the server (GET /api/auth/me)
 * whether the session cookie is valid. The cookie itself is HttpOnly, so
 * the browser app never sees or stores the session token.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [signedOutBy, setSignedOutBy] = useState<SignedOutBy>(null);

  const checkSession = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus(me ? 'authenticated' : 'unauthenticated');
    } catch {
      setUser(null);
      setStatus('unauthenticated');
      setError(NETWORK_ERROR_MESSAGE);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  // When the user comes back to the tab, quietly confirm the session is still
  // valid (it may have hit the 90-day cap or been revoked while they were away).
  // No loading state, and a network failure changes nothing: requests made
  // after that still catch an ended session through the 401 handler below.
  const statusRef = useRef(status);
  statusRef.current = status;
  useOnReturn(
    () => {
      authApi
        .me()
        .then((me) => {
          // Ignore a late reply if the user logged out (or in again) meanwhile.
          if (statusRef.current !== 'authenticated') return;
          if (me) {
            setUser(me);
          } else {
            setUser(null);
            setStatus('unauthenticated');
            setSignedOutBy('session-ended');
          }
        })
        .catch(() => {});
    },
    { enabled: status === 'authenticated' },
  );

  // Any API call that comes back 401 (expired/revoked session) signs the user out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
      setSignedOutBy('session-ended');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const u = await authApi.login(input);
    setUser(u);
    setStatus('authenticated');
    setSignedOutBy(null);
    setError(null);
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const u = await authApi.signup(input);
    setUser(u);
    setStatus('authenticated');
    setSignedOutBy(null);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear local state even if the request failed; the cookie is HttpOnly
      // so the server is the only place it can be revoked.
      setUser(null);
      setStatus('unauthenticated');
      setSignedOutBy('logout');
    }
  }, []);

  const clearSignedOutBy = useCallback(() => setSignedOutBy(null), []);

  const value = useMemo(
    () => ({ status, user, signedOutBy, error, login, signup, logout, retry: checkSession, clearSignedOutBy }),
    [status, user, signedOutBy, error, login, signup, logout, checkSession, clearSignedOutBy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Signed-in user. Only use inside routes wrapped by <RequireAuth>. */
export function useCurrentUser(): PublicUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser called without an authenticated user');
  return user;
}
