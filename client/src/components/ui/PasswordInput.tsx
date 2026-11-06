import { useState, type InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Password input with a show/hide toggle. Props (id, aria-*) pass through to the <input>. */
export default function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} className={`input ${className ?? ''}`} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOffIcon width={17} height={17} /> : <EyeIcon width={17} height={17} />}
      </button>
    </div>
  );
}
