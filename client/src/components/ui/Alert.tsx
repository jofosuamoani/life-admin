import type { ReactNode } from 'react';
import { AlertIcon, CheckCircleIcon, InfoIcon } from './Icons';

interface Props {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
  action?: ReactNode;
}

const ICONS = { info: InfoIcon, error: AlertIcon, success: CheckCircleIcon };

/** Inline message banner. Errors are announced to screen readers immediately. */
export default function Alert({ tone = 'info', children, action }: Props) {
  const Icon = ICONS[tone];
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon width={18} height={18} className="alert-icon" />
      <div className="alert-body">{children}</div>
      {action && <div className="alert-action">{action}</div>}
    </div>
  );
}
