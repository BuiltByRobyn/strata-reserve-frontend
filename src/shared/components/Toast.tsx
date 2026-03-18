import { useEffect } from 'react';
import type { ToastProps } from '../types/component.types';

export const Toast = ({ message, onDismiss }: ToastProps) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="toast toast--error" role="alert">
      <span>{message}</span>
      <button className="toast__close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
};
