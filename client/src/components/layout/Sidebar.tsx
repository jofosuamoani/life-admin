import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth, useCurrentUser } from '../../lib/auth';
import { useToday } from '../../lib/clock';
import { isOverdue } from '../../lib/tasks';
import { initials } from '../../lib/user';
import { useTasks } from '../tasks/TasksProvider';
import {
  CheckIcon,
  CloseIcon,
  DashboardIcon,
  InboxIcon,
  LogoutIcon,
  SettingsIcon,
  TasksIcon,
} from '../ui/Icons';

interface Props {
  id: string;
  /** Drawer state on mobile (ignored on desktop, where the sidebar is always visible). */
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ id, open, onClose }: Props) {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { tasks } = useTasks();
  const today = useToday();
  const [loggingOut, setLoggingOut] = useState(false);

  const overdueCount = useMemo(() => tasks.filter((t) => isOverdue(t, today)).length, [tasks, today]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // RequireAuth sees signedOutBy === 'logout' and sends the user to /login.
      await logout();
    } catch {
      // Local state is cleared regardless (see AuthProvider.logout).
    }
  }

  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <aside id={id} className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-header">
        <Link to="/" className="brand" aria-label="Life Admin — go to dashboard">
          <span className="brand-mark">
            <CheckIcon width={14} height={14} strokeWidth={3} />
          </span>
          <span className="brand-name">Life Admin</span>
        </Link>
        <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation">
          <CloseIcon width={18} height={18} />
        </button>
      </div>

      <nav className="nav">
        <NavLink to="/" end className={navClass}>
          <DashboardIcon />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/tasks" className={navClass}>
          <TasksIcon />
          <span>Tasks</span>
          {overdueCount > 0 && (
            <span className="nav-count danger" title={`${overdueCount} overdue`}>
              {overdueCount}
              <span className="visually-hidden"> overdue</span>
            </span>
          )}
        </NavLink>
        <NavLink to="/inbox" className={navClass}>
          <InboxIcon />
          <span>Inbox</span>
          <span className="nav-badge">Soon</span>
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          <SettingsIcon />
          <span>Settings</span>
          <span className="nav-badge">Soon</span>
        </NavLink>
      </nav>

      <div className="sidebar-account">
        <NavLink
          to="/account"
          className={({ isActive }) => `account-link${isActive ? ' active' : ''}`}
          aria-label={`Account: ${user.name}`}
          title="View account"
        >
          <span className="avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="account-text">
            <span className="account-name">{user.name}</span>
            <span className="account-cta">Account</span>
          </span>
        </NavLink>
        <button
          type="button"
          className="icon-button logout-button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log out"
        >
          <LogoutIcon width={17} height={17} />
        </button>
      </div>
    </aside>
  );
}
