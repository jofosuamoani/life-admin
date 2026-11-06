import type { ComponentType, ReactNode, SVGProps } from 'react';

interface Props {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Smaller variant for use inside cards. */
  compact?: boolean;
  tone?: 'default' | 'success';
}

export default function EmptyState({ icon: Icon, title, description, action, compact, tone = 'default' }: Props) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''} tone-${tone}`}>
      <span className="empty-state-icon">
        <Icon width={compact ? 20 : 24} height={compact ? 20 : 24} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
