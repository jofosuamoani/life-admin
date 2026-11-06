import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PASSWORD_MIN_LENGTH, signupSchema } from '@life-admin/shared';
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

type Field = 'name' | 'email' | 'password';

export default function SignupPage() {
  useDocumentTitle('Create account');
  // Carry "where to go after signing in" across the login <-> signup links.
  const { state: redirectState } = useLocation();
  const { signup, error: sessionError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const rateLimit = useRateLimitNotice();
  const shownError = rateLimit.message ?? formError ?? sessionError;

  function clearFieldError(field: Field) {
    if (fieldErrors[field]) setFieldErrors((f) => ({ ...f, [field]: undefined }));
    if (field === 'email') setEmailTaken(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    rateLimit.clear();

    // Same schema the server enforces, for instant feedback.
    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error.issues));
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      // On success RedirectIfAuthenticated sends the user on (the page they came from, or the dashboard).
      await signup(parsed.data);
    } catch (err) {
      setSubmitting(false);
      if (rateLimit.showIfRateLimited(err)) return;
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ email: 'An account with this email already exists.' });
        setEmailTaken(true);
        return;
      }
      const fields = apiFieldErrors<Field>(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setFormError(errorMessage(err, 'Couldn’t create your account. Please try again.'));
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Keep track of everything life throws at you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={redirectState} className="link">
            Log in
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {shownError && <Alert tone="error">{shownError}</Alert>}

        <FormField label="Name" error={fieldErrors.name}>
          <input
            className="input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError('name');
            }}
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
          />
        </FormField>
        {emailTaken && (
          <p className="field-followup">
            <Link to="/login" state={redirectState} className="link">
              Log in instead
            </Link>
          </p>
        )}

        <FormField
          label="Password"
          error={fieldErrors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        >
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError('password');
            }}
          />
        </FormField>

        <button type="submit" className="button primary block" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
