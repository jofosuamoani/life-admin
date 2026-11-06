import type { ComponentType, SVGProps } from 'react';
import { CheckIcon } from './Icons';

interface Props {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  planned: string[];
}

/** Deliberate "not built yet" state for upcoming sections. */
export default function ComingSoon({ icon: Icon, title, description, planned }: Props) {
  return (
    <section className="card coming-soon">
      <span className="coming-soon-icon">
        <Icon width={26} height={26} strokeWidth={1.75} />
      </span>
      <span className="pill">Coming soon</span>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <ul className="planned-list" aria-label="Planned features">
        {planned.map((item) => (
          <li key={item}>
            <CheckIcon width={15} height={15} />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
