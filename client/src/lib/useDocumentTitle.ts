import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Tasks · Life Admin". */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Life Admin` : 'Life Admin';
  }, [title]);
}
