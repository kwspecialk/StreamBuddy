import { useEffect, useRef } from 'react';

export const useEscapeKey = (isActive, onEscape) => {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onEscapeRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
};

// Close on Escape, lock page scroll, and move focus into the dialog and back again
const useModalBehavior = (isOpen, onClose) => {
  const dialogRef = useRef(null);

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    if (!dialogRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return dialogRef;
};

export default useModalBehavior;
