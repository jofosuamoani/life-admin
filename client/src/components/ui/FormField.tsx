import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

interface Props {
  label: string;
  /** A single input/select/textarea (or component that forwards these props). */
  children: ReactElement<Record<string, unknown>>;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

/**
 * Label + control + hint/error, wired up for accessibility: the control gets
 * an id, aria-invalid, and aria-describedby pointing at the hint or error.
 */
export default function FormField({ label, children, error, hint, className }: Props) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })
    : children;

  return (
    <div className={`field${error ? ' has-error' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {message && (
        <span id={messageId} className={error ? 'field-error' : 'field-hint'}>
          {message}
        </span>
      )}
    </div>
  );
}
