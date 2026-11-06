import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  /** Prevents closing (Esc, backdrop, ×) while e.g. a request is in flight. */
  dismissible?: boolean;
}

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Esc closes it, and it renders in the browser's top layer.
 *
 * Children only mount while open, so forms inside start fresh each time.
 * The close button comes last in the DOM so the first field (or the
 * Cancel button in a confirmation) gets focus when the dialog opens.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        // Esc: let React state drive closing.
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onMouseDown={(e) => {
        // Only a press that starts on the backdrop closes it (not a text selection that ends there).
        if (e.target === ref.current && dismissible) onClose();
      }}
    >
      {open && (
        <div className="modal-content">
          <header className="modal-header">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="modal-description">
                {description}
              </div>
            )}
          </header>
          {children && <div className="modal-body">{children}</div>}
          {footer && <footer className="modal-footer">{footer}</footer>}
          <button
            type="button"
            className="icon-button modal-close"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      )}
    </dialog>
  );
}
