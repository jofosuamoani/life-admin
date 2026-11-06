import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from '../components/ui/Icons';

type ToastTone = 'success' | 'error' | 'info';

interface ToastOptions {
  tone?: ToastTone;
  /** Optional inline action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends Required<Pick<ToastOptions, 'tone'>> {
  id: number;
  message: string;
  action?: ToastOptions['action'];
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const ICONS = { success: CheckCircleIcon, error: AlertIcon, info: InfoIcon };
const MAX_VISIBLE = 3;
let nextId = 0;

/** Lightweight toast notifications for success/error feedback after actions. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message: string, { tone = 'success', action }: ToastOptions = {}) => {
      const id = ++nextId;
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, message, tone, action }]);
      // Errors and actionable toasts stay a little longer.
      const ms = tone === 'error' ? 7000 : action ? 6000 : 3500;
      timers.current.set(id, window.setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
              <Icon width={18} height={18} className="toast-icon" />
              <span className="toast-message">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx.toast;
}
