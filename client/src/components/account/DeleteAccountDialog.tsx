import { useState, type FormEvent } from 'react';
import { deleteAccountSchema } from '@life-admin/shared';
import { errorMessage } from '../../api/http';
import { useAuth } from '../../lib/auth';
import { apiFieldErrors, toFieldErrors, type FieldErrors } from '../../lib/forms';
import { useRateLimitNotice } from '../../lib/useRateLimitNotice';
import Alert from '../ui/Alert';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import PasswordInput from '../ui/PasswordInput';
import Spinner from '../ui/Spinner';

interface Props {
  open: boolean;
  onClose: () => void;
  taskCount: number | null;
}

export default function DeleteAccountDialog({ open, onClose, taskCount }: Props) {
  const [busy, setBusy] = useState(false);
  const tasks =
    taskCount === null ? 'all your tasks' : taskCount === 1 ? 'your 1 task' : `all ${taskCount} of your tasks`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete your account?"
      size="sm"
      description={
        <>
          This permanently deletes your account and {tasks}, and logs you out everywhere.{' '}
          <strong>This can’t be undone.</strong>
        </>
      }
      dismissible={!busy}
    >
      <DeleteAccountForm onCancel={onClose} onBusyChange={setBusy} />
    </Modal>
  );
}

function DeleteAccountForm({ onCancel, onBusyChange }: { onCancel: () => void; onBusyChange: (b: boolean) => void }) {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'password'>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const rateLimit = useRateLimitNotice();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    rateLimit.clear();

    const parsed = deleteAccountSchema.safeParse({ password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<'password'>(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    onBusyChange(true);
    try {
      // On success the user is signed out and RequireAuth sends them to the login page.
      await deleteAccount(parsed.data);
    } catch (err) {
      setSubmitting(false);
      onBusyChange(false);
      setPassword('');
      if (rateLimit.showIfRateLimited(err)) return;
      const fields = apiFieldErrors<'password'>(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setFormError(errorMessage(err, 'Couldn’t delete your account. Please try again.'));
    }
  }

  const shownError = rateLimit.message ?? formError;

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      {shownError && <Alert tone="error">{shownError}</Alert>}

      <FormField label="Password" error={fieldErrors.password} hint="Enter your password to confirm.">
        <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </FormField>

      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="button danger" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </form>
  );
}
