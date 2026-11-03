import React, { useEffect } from 'react';

const TOAST_MS = 6000;

// One message at a time. A new toast replaces the old one and restarts the timer.
const UndoToast = ({ toast, onUndo, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="undo-toast" role="status">
      <p>{toast.message}</p>
      {toast.snapshot && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onUndo}>Undo</button>
      )}
    </div>
  );
};

export default UndoToast;
