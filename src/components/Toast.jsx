import { useEffect } from 'react';

export default function Toast({ message, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  return (
    <div
      className={`toast ${visible ? 'toast--visible' : ''}`}
      aria-live="polite"
    >
      <span className="toast__icon">✓</span>
      <span className="toast__message">{message}</span>
    </div>
  );
}
