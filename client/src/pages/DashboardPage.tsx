import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TASK_CATEGORIES, type Task } from '@life-admin/shared';
import { useTasks } from '../components/tasks/TasksProvider';
import TaskList from '../components/tasks/TaskList';
import { categoryClass } from '../components/tasks/TaskBadges';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Spinner from '../components/ui/Spinner';
import StatCard from '../components/ui/StatCard';
import { StatSkeleton, TaskListSkeleton } from '../components/ui/Skeleton';
import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  SparkleIcon,
} from '../components/ui/Icons';
import { useCurrentUser } from '../lib/auth';
import { useNow } from '../lib/clock';
import { formatLongDate, greetingFor, todayISO } from '../lib/dates';
import { dueStatus } from '../lib/tasks';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { firstName } from '../lib/user';

const UPCOMING_LIMIT = 5;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** One-line answer to "what needs my attention?" */
function summary(overdue: number, dueToday: number, soon: number, open: number): string {
  if (overdue || dueToday) {
    const parts = [overdue && `${plural(overdue, 'task')} overdue`, dueToday && `${dueToday} due today`].filter(Boolean);
    return `You have ${parts.join(' and ')}.`;
  }
  if (soon) return `Nothing urgent. ${plural(soon, 'task')} coming up this week.`;
  if (open) return 'Nothing due this week. You’re on top of things.';
  return 'Everything’s done. Enjoy the free time!';
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { tasks, status, loadError, expectTasks, reload, openCreate } = useTasks();
  const now = useNow();
  const today = todayISO(now);
  const name = firstName(useCurrentUser().name);

  const groups = useMemo(() => {
    const byStatus = (s: ReturnType<typeof dueStatus>) => tasks.filter((t) => dueStatus(t, today) === s);
    const open = tasks.filter((t) => !t.completed);
    return {
      overdue: byStatus('overdue'),
      today: byStatus('today'),
      soon: byStatus('soon'),
      open,
      completed: tasks.length - open.length,
    };
  }, [tasks, today]);

  const byCategory = useMemo(
    () =>
      TASK_CATEGORIES.map((category) => {
        const inCat = tasks.filter((t) => t.category === category);
        const open = inCat.filter((t) => !t.completed).length;
        return { category, total: inCat.length, open, done: inCat.length - open };
      }).filter((c) => c.total > 0),
    [tasks],
  );

  const newTaskButton = (
    <button type="button" className="button primary" onClick={openCreate}>
      <PlusIcon width={16} height={16} /> New task
    </button>
  );

  const ready = status === 'ready';
  const isEmpty = ready && tasks.length === 0;
  // While loading, only show the full layout's placeholder (and the header's
  // New task button) if this user had tasks last time. Otherwise a neutral card,
  // so an empty account doesn't flash stat cards before the welcome screen.
  const loadingFull = status === 'loading' && expectTasks;
  const loadingNeutral = status === 'loading' && !expectTasks;
  const attentionCount = groups.overdue.length + groups.today.length + groups.soon.length;
  const completionPct = tasks.length ? Math.round((groups.completed / tasks.length) * 100) : 0;

  return (
    <div className="page">
      <PageHeader
        title={`${greetingFor(now)}, ${name}`}
        subtitle={
          <>
            <span className="page-date">{formatLongDate(now)}</span>
            {ready && !isEmpty && (
              <> · {summary(groups.overdue.length, groups.today.length, groups.soon.length, groups.open.length)}</>
            )}
          </>
        }
        actions={!isEmpty && !loadingNeutral && newTaskButton}
      />

      {status === 'error' && (
        <Alert
          tone="error"
          action={
            <button type="button" className="button secondary small" onClick={reload}>
              Try again
            </button>
          }
        >
          {loadError}
        </Alert>
      )}

      {loadingNeutral && (
        <section className="card card-loader">
          <Spinner label="Loading your tasks" />
        </section>
      )}

      {loadingFull && (
        <>
          <section className="stats-grid">
            {[0, 1, 2, 3].map((i) => (
              <StatSkeleton key={i} />
            ))}
          </section>
          <section className="card">
            <TaskListSkeleton rows={4} />
          </section>
        </>
      )}

      {isEmpty && (
        <section className="card">
          <EmptyState
            icon={SparkleIcon}
            title="Welcome to Life Admin"
            description="Keep track of renewals, bills, appointments and everything else life throws at you. Start by adding your first task."
            action={newTaskButton}
          />
        </section>
      )}

      {ready && !isEmpty && (
        <>
          <section className="stats-grid" aria-label="Summary">
            <StatCard label="Overdue" value={groups.overdue.length} icon={AlertIcon} tone="danger" hint="Past their due date" />
            <StatCard label="Due today" value={groups.today.length} icon={ClockIcon} tone="warning" hint="Today’s deadlines" />
            <StatCard label="Next 7 days" value={groups.soon.length} icon={CalendarIcon} tone="primary" hint="Coming up" />
            <StatCard
              label="Completed"
              value={groups.completed}
              icon={CheckCircleIcon}
              tone="success"
              hint={`${completionPct}% of all tasks`}
            />
          </section>

          <div className="dashboard-grid">
            <section className="card" aria-labelledby="attention-heading">
              <div className="card-header">
                <div>
                  <h2 id="attention-heading">Needs attention</h2>
                  <p className="card-subtitle">Overdue, due today, and due in the next 7 days</p>
                </div>
                <Link to="/tasks" className="link">
                  All tasks →
                </Link>
              </div>

              {attentionCount === 0 ? (
                <EmptyState
                  compact
                  tone="success"
                  icon={CheckCircleIcon}
                  title="You’re all caught up"
                  description={
                    groups.open.length
                      ? `Nothing is due this week. You have ${plural(groups.open.length, 'open task')} for later.`
                      : 'Every task is done.'
                  }
                />
              ) : (
                <div className="attention-groups">
                  <AttentionGroup title="Overdue" tone="danger" tasks={groups.overdue} />
                  <AttentionGroup title="Due today" tone="warning" tasks={groups.today} />
                  <AttentionGroup
                    title="Next 7 days"
                    tone="primary"
                    tasks={groups.soon.slice(0, UPCOMING_LIMIT)}
                    total={groups.soon.length}
                  />
                </div>
              )}
            </section>

            <section className="card" aria-labelledby="category-heading">
              <div className="card-header">
                <div>
                  <h2 id="category-heading">By category</h2>
                  <p className="card-subtitle">Progress across areas of your life</p>
                </div>
              </div>
              <ul className="category-list">
                {byCategory.map(({ category, total, open, done }) => (
                  <li key={category}>
                    <Link
                      to={`/tasks?category=${category}`}
                      className={`category-row ${categoryClass(category)}`}
                      aria-label={`${category}: ${open} open, ${done} done`}
                    >
                      <span className="category-name">
                        <span className="badge-dot" aria-hidden="true" />
                        {category}
                      </span>
                      <span className="category-count">
                        {done}/{total}
                      </span>
                      <span className="progress" aria-hidden="true">
                        <span className="progress-bar" style={{ width: `${(done / total) * 100}%` }} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function AttentionGroup({
  title,
  tone,
  tasks,
  total = tasks.length,
}: {
  title: string;
  tone: 'danger' | 'warning' | 'primary';
  tasks: Task[];
  total?: number;
}) {
  if (total === 0) return null;
  return (
    <div className="attention-group">
      <h3 className={`attention-title tone-${tone}`}>
        {title}
        <span className="count-pill">{total}</span>
      </h3>
      <TaskList tasks={tasks} label={title} />
      {total > tasks.length && (
        <Link to="/tasks?status=open" className="link more-link">
          + {total - tasks.length} more in Tasks
        </Link>
      )}
    </div>
  );
}
