import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TasksProvider } from '../tasks/TasksProvider';
import { CheckIcon, MenuIcon } from '../ui/Icons';
import Sidebar from './Sidebar';

/**
 * Shell for every signed-in page. Desktop: fixed sidebar. Mobile: top bar
 * with a menu button that opens the same sidebar as a slide-in drawer.
 */
export default function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the drawer after navigating.
  useEffect(() => setNavOpen(false), [pathname]);

  // While open: Esc closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.classList.add('scroll-locked');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('scroll-locked');
    };
  }, [navOpen]);

  return (
    <TasksProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="app-shell">
        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            aria-controls="app-sidebar"
          >
            <MenuIcon width={20} height={20} />
          </button>
          <Link to="/" className="brand" aria-label="Life Admin — go to dashboard">
            <span className="brand-mark">
              <CheckIcon width={14} height={14} strokeWidth={3} />
            </span>
            <span className="brand-name">Life Admin</span>
          </Link>
        </header>

        <Sidebar id="app-sidebar" open={navOpen} onClose={() => setNavOpen(false)} />
        {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}

        <main className="main" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </TasksProvider>
  );
}
