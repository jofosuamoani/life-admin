import { useState, type FormEvent } from 'react';
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from '@life-admin/shared';
import { authApi } from '../../api/auth';
import { errorMessage } from '../../api/http';
import { apiFieldErrors, toFieldErrors, type FieldErrors } from '../../lib/forms';
import { useRateLimitNotice } from '../../lib/useRateLimitNotice';
import { useToast } from '../../lib/toast';
import Alert from '../ui/Alert';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import PasswordInput from '../ui/PasswordInput';
import Spinner from '../ui/Spinner';

type Field = 'currentPassword' | 'newPassword';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a successful change (other devices were signed out). */
  onChanged: () => void;
}

export default function ChangePasswordDialog({ open, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      description="You’ll stay logged in here. Any other devices will be logged out."
      dismissible={!busy}
    >
      <ChangePasswordForm
        onCancel={onClose}
        onBusyChange={setBusy}
        onDone={() => {
          onChanged();
          onClose();
        }}
      />
    </Modal>
  );
}

function ChangePasswordForm({
  onCancel,
  onDone,
  onBusyChange,
}: {
  onCancel: () => void;
  onDone: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const rateLimit = useRateLimitNotice();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    rateLimit.clear();

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error.issues));
      return;
    }
    if (currentPassword === newPassword) {
      setFieldErrors({ newPassword: 'Choose a password different from your current one' });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    onBusyChange(true);
    try {
      const { otherSessionsEnded } = await authApi.changePassword(parsed.data);
      toast(
        otherSessionsEnded > 0
          ? `Password changed. ${otherSessionsEnded === 1 ? '1 other device was' : `${otherSessionsEnded} other devices were`} logged out.`
          : 'Password changed',
      );
      onBusyChange(false);
      onDone();
    } catch (err) {
      setSubmitting(false);
      onBusyChange(false);
      setCurrentPassword('');
      if (rateLimit.showIfRateLimited(err)) return;
      const fields = apiFieldErrors<Field>(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setFormError(errorMessage(err, 'Couldn’t change your password. Please try again.'));
    }
  }

  const shownError = rateLimit.message ?? formError;

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      {shownError && <Alert tone="error">{shownError}</Alert>}

      <FormField label="Current password" error={fieldErrors.currentPassword}>
        <PasswordInput
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoFocus
        />
      </FormField>

      <FormField
        label="New password"
        error={fieldErrors.newPassword}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      >
        <PasswordInput autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </FormField>

      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
