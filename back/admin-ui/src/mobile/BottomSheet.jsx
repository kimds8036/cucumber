import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function BottomSheet({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="m-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="m-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="m-sheet-handle" />
        <header className="m-sheet-head">
          <strong>{title}</strong>
          <button type="button" onClick={onClose}>닫기</button>
        </header>
        <div className="m-sheet-body">{children}</div>
        {footer ? <footer className="m-sheet-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
