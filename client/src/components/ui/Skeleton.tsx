/** Placeholder rows shown while tasks load (avoids layout jumps vs. a "Loading…" line). */
export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="task-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="skeleton-row">
          <span className="skeleton skeleton-circle" />
          <span className="skeleton-lines">
            <span className="skeleton" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <span className="skeleton skeleton-short" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatSkeleton() {
  return (
    <div className="card stat-card" aria-hidden="true">
      <span className="skeleton skeleton-short" />
      <span className="skeleton skeleton-stat" />
    </div>
  );
}
