export default function StatusPill({ label, state = 'unknown' }) {
  const text = state === 'ok' ? '정상' : state === 'danger' ? '장애' : '미확인';
  return (
    <span className={`status-pill status-pill-${state}`}>
      <span className="status-pill-dot" />
      {label}
      <span className="status-pill-state">{text}</span>
    </span>
  );
}
