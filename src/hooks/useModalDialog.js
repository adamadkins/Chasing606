import { useEffect, useRef } from 'react';

/**
 * Opens a native <dialog> as a modal while the component is mounted.
 * The browser handles focus trapping, Escape, and returning focus on close.
 * Returns a click handler that closes the dialog when its backdrop is clicked.
 */
export default function useModalDialog(dialogRef, onClose) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    const handleClose = () => closeRef.current();
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
      if (dialog.open) dialog.close();
    };
  }, [dialogRef]);

  // A click that lands on the <dialog> element itself, not its contents, hit the backdrop.
  return event => { if (event.target === event.currentTarget) dialogRef.current.close(); };
}
