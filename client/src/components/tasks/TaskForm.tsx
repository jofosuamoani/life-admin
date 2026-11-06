import { useState, type FormEvent } from 'react';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  createTaskSchema,
  type CreateTaskInput,
  type Task,
  type TaskCategory,
  type TaskPriority,
} from '@life-admin/shared';
import { errorMessage } from '../../api/http';
import { addDaysISO, todayISO } from '../../lib/dates';
import { apiFieldErrors, toFieldErrors, type FieldErrors } from '../../lib/forms';
import Alert from '../ui/Alert';
import FormField from '../ui/FormField';
import Spinner from '../ui/Spinner';

type Field = 'title' | 'category' | 'priority' | 'dueDate';

interface Props {
  /** Pre-fills the form for editing. */
  initial?: Task;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
}

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
];

export default function TaskForm({ initial, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<TaskCategory>(initial?.category ?? 'Personal');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'Medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const today = todayISO();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Same schema the server enforces, for instant feedback.
    const parsed = createTaskSchema.safeParse({ title, category, priority, dueDate: dueDate || null });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const { title: t, category: c, priority: p, dueDate: d } = parsed.data;
      await onSubmit({ title: t, category: c, priority: p, dueDate: d });
    } catch (err) {
      const fields = apiFieldErrors<Field>(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setFormError(errorMessage(err, "Couldn't save the task. Please try again."));
      setSubmitting(false);
    }
    // On success the dialog closes and this form unmounts.
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}

      <FormField label="Title" error={fieldErrors.title}>
        <input
          className="input"
          type="text"
          placeholder="e.g. Renew driver’s license"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (fieldErrors.title) setFieldErrors((f) => ({ ...f, title: undefined }));
          }}
          maxLength={200}
          autoComplete="off"
        />
      </FormField>

      <div className="form-row">
        <FormField label="Category" error={fieldErrors.category}>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Due date" error={fieldErrors.dueDate}>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
      </div>

      <div className="quick-dates" role="group" aria-label="Quick due dates">
        {QUICK_DATES.map(({ label, days }) => {
          const value = addDaysISO(today, days);
          return (
            <button
              key={label}
              type="button"
              className={`chip${dueDate === value ? ' active' : ''}`}
              onClick={() => setDueDate(value)}
            >
              {label}
            </button>
          );
        })}
        <button type="button" className={`chip${!dueDate ? ' active' : ''}`} onClick={() => setDueDate('')}>
          No date
        </button>
      </div>

      <fieldset className="field">
        <legend>Priority</legend>
        <div className="segmented" role="radiogroup" aria-label="Priority">
          {TASK_PRIORITIES.map((p) => (
            <label key={p} className={`segmented-option pri-${p.toLowerCase()}${priority === p ? ' active' : ''}`}>
              <input
                type="radio"
                name="priority"
                value={p}
                checked={priority === p}
                onChange={() => setPriority(p)}
              />
              <span className="pri-dot" aria-hidden="true" />
              {p}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting && <Spinner />}
          {initial ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
