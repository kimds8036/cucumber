import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function BottomSheet({ open, title, onClose, children, footer }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const viewport = window.visualViewport;
    const syncKeyboard = () => {
      const inset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      sheetRef.current?.style.setProperty('--m-kb', `${inset}px`);
    };
    window.addEventListener('keydown', onKey);
    viewport?.addEventListener('resize', syncKeyboard);
    viewport?.addEventListener('scroll', syncKeyboard);
    syncKeyboard();
    return () => {
      window.removeEventListener('keydown', onKey);
      viewport?.removeEventListener('resize', syncKeyboard);
      viewport?.removeEventListener('scroll', syncKeyboard);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="m-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={sheetRef}
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
