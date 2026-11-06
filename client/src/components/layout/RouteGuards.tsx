import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { postLoginPath, type LoginRedirectState } from '../../lib/redirect';
import Spinner from '../ui/Spinner';

function FullPageLoader() {
  return (
    <div className="full-page-loader">
      <Spinner label="Loading" />
    </div>
  );
}

/**
 * Renders child routes only for signed-in users; otherwise sends them to /login.
 *
 * Where they return to after logging in:
 * - Sent here involuntarily (expired session, bookmark, deep link):
 *   remember the current page so they come back to it.
 * - Deliberately logged out: start fresh on the dashboard.
 */
export function RequireAuth() {
  const { status, signedOutBy } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'unauthenticated') {
    const state: LoginRedirectState | undefined =
      signedOutBy === 'logout' ? undefined : { from: location.pathname + location.search + location.hash };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/**
 * For /login and /signup. Once the user is signed in this is the single
 * place that decides where they land: the page they were sent from, or the dashboard.
 */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={postLoginPath(location.state)} replace />;
  return <Outlet />;
}
