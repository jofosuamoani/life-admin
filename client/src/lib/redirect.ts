/** Router state attached when RequireAuth sends someone to /login. */
export interface LoginRedirectState {
  from?: unknown;
}

const AUTH_PAGES = ['/login', '/signup'];

/**
 * Where to go after logging in. Only same-app paths are allowed, which
 * prevents open redirects (e.g. "//evil.example" or "https://…").
 */
export function postLoginPath(state: unknown): string {
  const from = (state as LoginRedirectState | null)?.from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return '/';
  const pathname = from.split(/[?#]/)[0];
  if (AUTH_PAGES.includes(pathname)) return '/';
  return from;
}
