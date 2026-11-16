import { useRef, useState } from 'react';
import ChangePasswordDialog from '../components/account/ChangePasswordDialog';
import DeleteAccountDialog from '../components/account/DeleteAccountDialog';
import DevicesCard, { type DevicesCardHandle } from '../components/account/DevicesCard';
import EditProfileDialog from '../components/account/EditProfileDialog';
import { useTasks } from '../components/tasks/TasksProvider';
import PageHeader from '../components/ui/PageHeader';
import Spinner from '../components/ui/Spinner';
import { LogoutIcon, PencilIcon } from '../components/ui/Icons';
import { useAuth, useCurrentUser } from '../lib/auth';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { initials } from '../lib/user';

type Dialog = 'profile' | 'password' | 'delete' | null;

export default function AccountPage() {
  useDocumentTitle('Account');
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { tasks, status: tasksStatus } = useTasks();
  const [loggingOut, setLoggingOut] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const devices = useRef<DevicesCardHandle>(null);
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

  const close = () => setDialog(null);

  return (
    <div className="page page-narrow">
      <PageHeader title="Account" subtitle="Your Life Admin account details." />

      <section className="card" aria-labelledby="profile-heading">
        <div className="account-hero">
          <span className="avatar large" aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className="account-hero-text">
            <h2 id="profile-heading">{user.name}</h2>
            <p className="muted">{user.email}</p>
          </div>
          <button type="button" className="button secondary small" onClick={() => setDialog('profile')}>
            <PencilIcon width={14} height={14} />
            Edit
          </button>
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
      </section>

      <section className="card session-card" aria-labelledby="password-heading">
        <div>
          <h2 id="password-heading">Password</h2>
          <p className="muted">Changing it logs you out on all your other devices.</p>
        </div>
        <button type="button" className="button secondary" onClick={() => setDialog('password')}>
          Change password
        </button>
      </section>

      <DevicesCard ref={devices} />

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

      <section className="card session-card danger-zone" aria-labelledby="delete-heading">
        <div>
          <h2 id="delete-heading">Delete account</h2>
          <p className="muted">Permanently delete your account and all your tasks.</p>
        </div>
        <button type="button" className="button danger-outline" onClick={() => setDialog('delete')}>
          Delete account
        </button>
      </section>

      <EditProfileDialog open={dialog === 'profile'} onClose={close} />
      <ChangePasswordDialog
        open={dialog === 'password'}
        onClose={close}
        onChanged={() => devices.current?.reload()}
      />
      <DeleteAccountDialog
        open={dialog === 'delete'}
        onClose={close}
        taskCount={tasksStatus === 'ready' ? tasks.length : null}
      />
    </div>
  );
}
