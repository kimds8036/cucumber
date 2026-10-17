import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function ImageViewer({ open, source, onClose, footer }) {
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setPhase('loading');
    setScale(1);
    setOrigin({ x: 0, y: 0 });
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, source, attempt, onClose]);

  if (!open) return null;

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      gesture.current = { kind: 'pinch', start: distance(pts[0], pts[1]), scale, origin };
    } else if (pts.length === 1) {
      gesture.current = { kind: 'pan', x: event.clientX, y: event.clientY, origin };
    }
  };

  const onPointerMove = (event) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && gesture.current?.kind === 'pinch') {
      const next = gesture.current.scale * (distance(pts[0], pts[1]) / gesture.current.start);
      setScale(Math.min(4, Math.max(1, next)));
      return;
    }
    if (pts.length === 1 && gesture.current?.kind === 'pan' && scale > 1) {
      setOrigin({
        x: gesture.current.origin.x + (event.clientX - gesture.current.x),
        y: gesture.current.origin.y + (event.clientY - gesture.current.y),
      });
    }
  };

  const onPointerUp = (event) => {
    pointers.current.delete(event.pointerId);
    gesture.current = null;
  };

  return createPortal(
    <div className="m-viewer" role="dialog" aria-modal="true" aria-label="학생증 이미지">
      <button type="button" className="m-viewer-close" onClick={onClose}>닫기</button>
      <div
        className="m-viewer-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {phase === 'loading' ? <span className="m-skel m-skel-lg" /> : null}
        {phase === 'error' ? (
          <div className="m-viewer-error">
            <p>이미지를 불러오지 못했어요</p>
            <button type="button" onClick={() => { setPhase('loading'); setAttempt((value) => value + 1); }}>재시도</button>
          </div>
        ) : null}
        {source ? (
          <img
            key={attempt}
            alt="학생증"
            src={source}
            draggable="false"
            onLoad={() => setPhase('ok')}
            onError={() => setPhase('error')}
            style={{
              opacity: phase === 'ok' ? 1 : 0,
              transform: `translate(${origin.x}px, ${origin.y}px) scale(${scale})`,
            }}
          />
        ) : null}
      </div>
      {footer ? <footer className="m-viewer-foot">{footer}</footer> : null}
    </div>,
    document.body,
  );
}
