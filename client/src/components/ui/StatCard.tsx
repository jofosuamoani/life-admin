import type { ComponentType, SVGProps } from 'react';

interface Props {
  label: string;
  value: number;
  hint?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tone only applies when value > 0, so "0 overdue" doesn't look alarming. */
  tone?: 'default' | 'danger' | 'warning' | 'success' | 'primary';
}

export default function StatCard({ label, value, hint, icon: Icon, tone = 'default' }: Props) {
  const activeTone = value > 0 ? tone : 'default';
  return (
    <div className={`card stat-card tone-${activeTone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">
          <Icon width={16} height={16} />
        </span>
      </div>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
