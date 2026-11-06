import type { ReactNode } from 'react';
import { CheckIcon } from '../ui/Icons';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Centered card layout shared by the Log In and Sign Up pages. */
export default function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="auth-shell">
      <main className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">
            <CheckIcon width={16} height={16} strokeWidth={3} />
          </span>
          <span>Life Admin</span>
        </div>
        <div className="card auth-card">
          <div className="auth-heading">
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          {children}
        </div>
        <p className="auth-footer">{footer}</p>
      </main>
    </div>
  );
}
