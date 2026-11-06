import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TASK_CATEGORIES, type TaskCategory } from '@life-admin/shared';
import { useTasks } from '../components/tasks/TasksProvider';
import TaskList from '../components/tasks/TaskList';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { TaskListSkeleton } from '../components/ui/Skeleton';
import { CheckCircleIcon, PlusIcon, SearchIcon, SparkleIcon, TasksIcon } from '../components/ui/Icons';
import { useDocumentTitle } from '../lib/useDocumentTitle';

type StatusFilter = 'all' | 'open' | 'completed';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

function isStatus(v: string | null): v is StatusFilter {
  return v === 'all' || v === 'open' || v === 'completed';
}
function isCategory(v: string | null): v is TaskCategory {
  return !!v && (TASK_CATEGORIES as readonly string[]).includes(v);
}

export default function TasksPage() {
  useDocumentTitle('Tasks');
  const { tasks, status: loadStatus, loadError, reload, openCreate } = useTasks();

  // Filters live in the URL, so they survive refreshes and links (e.g. from the dashboard).
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status');
  const rawCategory = params.get('category');
  const status: StatusFilter = isStatus(rawStatus) ? rawStatus : 'open';
  const category: TaskCategory | 'all' = isCategory(rawCategory) ? rawCategory : 'all';
  const query = params.get('q') ?? '';

  function updateParam(key: string, value: string | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  // Counts reflect the category and search filters, so each tab shows
  // how many tasks you'd see if you clicked it.
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) => (category === 'all' || t.category === category) && (!q || t.title.toLowerCase().includes(q)),
    );
  }, [tasks, category, query]);

  const counts = useMemo(
    () => ({
      all: matching.length,
      open: matching.filter((t) => !t.completed).length,
      completed: matching.filter((t) => t.completed).length,
    }),
    [matching],
  );

  const visible = useMemo(
    () => matching.filter((t) => status === 'all' || (status === 'open' ? !t.completed : t.completed)),
    [matching, status],
  );

  const filtersActive = category !== 'all' || query.trim() !== '';
  const clearFilters = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('category');
      next.delete('q');
      return next;
    }, { replace: true });

  const newTaskButton = (
    <button type="button" className="button primary" onClick={openCreate}>
      <PlusIcon width={16} height={16} /> New task
    </button>
  );

  function renderEmpty() {
    if (tasks.length === 0) {
      return (
        <EmptyState
          icon={SparkleIcon}
          title="No tasks yet"
          description="Add the first thing you need to take care of: a bill, a renewal, an appointment."
          action={newTaskButton}
        />
      );
    }
    if (filtersActive && matching.length === 0) {
      return (
        <EmptyState
          icon={SearchIcon}
          title="No matching tasks"
          description="Try a different search or category."
          action={
            <button type="button" className="button secondary" onClick={clearFilters}>
              Clear filters
            </button>
          }
        />
      );
    }
    if (status === 'open') {
      return (
        <EmptyState
          tone="success"
          icon={CheckCircleIcon}
          title="All done"
          description={category === 'all' ? 'You’ve completed every task.' : `No open ${category} tasks.`}
        />
      );
    }
    return (
      <EmptyState
        icon={TasksIcon}
        title="Nothing completed yet"
        description="Tasks you complete will show up here."
      />
    );
  }

  return (
    <div className="page">
      <PageHeader title="Tasks" subtitle="Everything on your plate, in one place." actions={newTaskButton} />

      {loadStatus === 'error' && (
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

      <section className="card tasks-card">
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Filter by status">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={status === tab.value}
                className={`tab${status === tab.value ? ' active' : ''}`}
                onClick={() => updateParam('status', tab.value === 'open' ? null : tab.value)}
              >
                {tab.label}
                <span className="tab-count">{counts[tab.value]}</span>
              </button>
            ))}
          </div>

          <div className="toolbar-filters">
            <label className="search-field">
              <SearchIcon width={16} height={16} />
              <span className="visually-hidden">Search tasks</span>
              <input
                type="search"
                className="input"
                placeholder="Search tasks"
                value={query}
                onChange={(e) => updateParam('q', e.target.value)}
              />
            </label>
            <select
              className="input filter-select"
              value={category}
              onChange={(e) => updateParam('category', e.target.value === 'all' ? null : e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loadStatus === 'loading' ? (
          <TaskListSkeleton rows={6} />
        ) : loadStatus === 'ready' && visible.length === 0 ? (
          renderEmpty()
        ) : (
          <TaskList tasks={visible} label="Tasks" />
        )}
      </section>
    </div>
  );
}
