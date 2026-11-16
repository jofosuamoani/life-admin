import { useState, type FormEvent } from 'react';
import { updateProfileSchema } from '@life-admin/shared';
import { ApiError, errorMessage } from '../../api/http';
import { authApi } from '../../api/auth';
import { useAuth, useCurrentUser } from '../../lib/auth';
import { apiFieldErrors, toFieldErrors, type FieldErrors } from '../../lib/forms';
import { useRateLimitNotice } from '../../lib/useRateLimitNotice';
import { useToast } from '../../lib/toast';
import Alert from '../ui/Alert';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import PasswordInput from '../ui/PasswordInput';
import Spinner from '../ui/Spinner';

type Field = 'name' | 'email' | 'currentPassword';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EditProfileDialog({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Edit profile" dismissible={!busy}>
      <EditProfileForm onDone={onClose} onBusyChange={setBusy} />
    </Modal>
  );
}

function EditProfileForm({ onDone, onBusyChange }: { onDone: () => void; onBusyChange: (busy: boolean) => void }) {
  const user = useCurrentUser();
  const { updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const rateLimit = useRateLimitNotice();

  // A new email is a new way into the account, so it needs the password.
  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    rateLimit.clear();

    const parsed = updateProfileSchema.safeParse({
      name,
      email,
      currentPassword: emailChanged ? currentPassword : undefined,
    });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error.issues));
      return;
    }
    if (emailChanged && !currentPassword) {
      setFieldErrors({ currentPassword: 'Enter your password to change your email' });
      return;
    }
    setFieldErrors({});

    const changes = parsed.data;
    if (changes.name === user.name && !emailChanged) {
      onDone();
      return;
    }

    setSubmitting(true);
    onBusyChange(true);
    try {
      const updated = await authApi.updateProfile(changes);
      updateUser(updated);
      toast(emailChanged ? 'Profile saved. Use your new email next time you log in.' : 'Profile saved');
      onBusyChange(false);
      onDone();
    } catch (err) {
      setSubmitting(false);
      onBusyChange(false);
      setCurrentPassword('');
      if (rateLimit.showIfRateLimited(err)) return;
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ email: 'Another account already uses this email' });
        return;
      }
      const fields = apiFieldErrors<Field>(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setFormError(errorMessage(err, 'Couldn’t save your profile. Please try again.'));
    }
  }

  const shownError = rateLimit.message ?? formError;

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      {shownError && <Alert tone="error">{shownError}</Alert>}

      <FormField label="Name" error={fieldErrors.name}>
        <input
          className="input"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoFocus
        />
      </FormField>

      <FormField label="Email" error={fieldErrors.email}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      {emailChanged && (
        <FormField
          label="Current password"
          error={fieldErrors.currentPassword}
          hint="Needed to change the email you log in with."
        >
          <PasswordInput
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </FormField>
      )}

      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onDone} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
