import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loginSchema } from '@life-admin/shared';
import { ApiError, errorMessage } from '../api/http';
import AuthLayout from '../components/layout/AuthLayout';
import Alert from '../components/ui/Alert';
import FormField from '../components/ui/FormField';
import PasswordInput from '../components/ui/PasswordInput';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../lib/auth';
import { apiFieldErrors, toFieldErrors, type FieldErrors } from '../lib/forms';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useRateLimitNotice } from '../lib/useRateLimitNotice';

type Field = 'email' | 'password';

const NOTICES = {
  logout: { tone: 'success', text: 'You’ve been logged out.' },
  'session-ended': { tone: 'info', text: 'Your session has ended. Please log in again to continue.' },
} as const;

export default function LoginPage() {
  useDocumentTitle('Log in');
  // Carry "where to go after logging in" across the login <-> signup links.
  const { state: redirectState } = useLocation();
  const { login, error: sessionError, retry, signedOutBy, clearSignedOutBy } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const rateLimit = useRateLimitNotice();
  const shownError = rateLimit.message ?? formError;

  // Show why the user is here once, then forget it (see AuthContextValue.clearSignedOutBy).
  // Dismissed on the first submit so it can't reappear while a retry is loading.
  const [notice, setNotice] = useState(() => (signedOutBy ? NOTICES[signedOutBy] : null));
  useEffect(() => {
    if (signedOutBy) clearSignedOutBy();
  }, [signedOutBy, clearSignedOutBy]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    rateLimit.clear();

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      // On success RedirectIfAuthenticated sends the user on (back to where they were, or the dashboard).
      await login(parsed.data);
    } catch (err) {
      setSubmitting(false);
      setPassword('');
      if (rateLimit.showIfRateLimited(err)) return;
      if (err instanceof ApiError && err.status === 401) {
        // Deliberately generic: never reveal whether the email has an account.
        setFormError('Incorrect email or password.');
        return;
      }
      const fields = apiFieldErrors<Field>(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setFormError(errorMessage(err, 'Couldn’t log in. Please try again.'));
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your Life Admin account."
      footer={
        <>
          New to Life Admin?{' '}
          <Link to="/signup" state={redirectState} className="link">
            Create an account
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {sessionError ? (
          <Alert
            tone="error"
            action={
              <button type="button" className="button secondary small" onClick={retry}>
                Retry
              </button>
            }
          >
            {sessionError}
          </Alert>
        ) : (
          notice && <Alert tone={notice.tone}>{notice.text}</Alert>
        )}
        {shownError && <Alert tone="error">{shownError}</Alert>}

        <FormField label="Email" error={fieldErrors.email}>
          <input
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </FormField>

        <FormField label="Password" error={fieldErrors.password}>
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>

        <button type="submit" className="button primary block" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
