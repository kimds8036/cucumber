const RANGES = [
  { id: '1', label: '오늘' },
  { id: '7', label: '7일' },
  { id: '30', label: '30일' },
];

function stampOf(date) {
  if (!date) return '갱신 전';
  return `마지막 갱신 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export default function MonitorDetail({
  range,
  onRange,
  summaries = [],
  chart = null,
  items = [],
  shown = 10,
  onMore,
  updatedAt,
  refreshing = false,
  pull,
  note = '',
  empty = '표시할 항목이 없습니다.',
}) {
  const visible = items.slice(0, shown);
  const cards = summaries.slice(0, 4);

  return (
    <div className="m-monitor" onTouchStart={pull?.onTouchStart} onTouchEnd={pull?.onTouchEnd}>
      <p className="m-updated">{refreshing ? '갱신 중…' : stampOf(updatedAt)} · 당겨서 새로고침</p>
      {onRange ? (
        <div className="m-segments" role="tablist">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={range === item.id ? 'is-active' : ''}
              onClick={() => onRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {cards.length > 0 ? (
        <div className="m-stat-grid">
          {cards.map((card) => (
            <article key={card.label} className="m-stat">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              {card.delta ? <em className={card.deltaTone || ''}>{card.delta}</em> : null}
            </article>
          ))}
        </div>
      ) : null}
      {chart}
      {note ? <p className="m-empty">{note}</p> : null}
      {visible.length === 0 ? (empty ? <p className="m-empty">{empty}</p> : null) : (
        <div className="m-cards">
          {visible.map((item) => (
            <article key={item.id} className="m-card">
              <div className="m-card-top">
                <span>{item.kicker}</span>
                <span>{item.trailing}</span>
              </div>
              <strong>{item.title}</strong>
              {item.body ? <p>{item.body}</p> : null}
            </article>
          ))}
        </div>
      )}
      {items.length > shown ? (
        <button type="button" className="m-more-btn" onClick={onMore}>더 보기</button>
      ) : null}
    </div>
  );
}
