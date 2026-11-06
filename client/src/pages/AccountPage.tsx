import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Spinner from '../components/ui/Spinner';
import { LogoutIcon } from '../components/ui/Icons';
import { useAuth, useCurrentUser } from '../lib/auth';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { initials } from '../lib/user';

export default function AccountPage() {
  useDocumentTitle('Account');
  const user = useCurrentUser();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // RequireAuth then sends the user to /login (and the dashboard after logging back in).
      await logout();
    } catch {
      // Local state is cleared regardless (see AuthProvider.logout).
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader title="Account" subtitle="Your Life Admin account details." />

      <section className="card" aria-labelledby="profile-heading">
        <div className="account-hero">
          <span className="avatar large" aria-hidden="true">
            {initials(user.name)}
          </span>
          <div>
            <h2 id="profile-heading">{user.name}</h2>
            <p className="muted">{user.email}</p>
          </div>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{memberSince}</dd>
          </div>
        </dl>
        <p className="card-note">Editing your name, email and password is coming soon.</p>
      </section>

      <section className="card session-card" aria-labelledby="session-heading">
        <div>
          <h2 id="session-heading">Log out</h2>
          <p className="muted">End your session on this device.</p>
        </div>
        <button type="button" className="button secondary" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? <Spinner /> : <LogoutIcon width={16} height={16} />}
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </section>
    </div>
  );
}
