import { useEffect, useState } from 'react';

const SEGMENTS = [
  { id: 'reports', label: '신고 관리' },
  { id: 'processedReports', label: '처리 이력' },
  { id: 'appeals', label: '이의신청' },
  { id: 'users', label: '제재 현황' },
];

function labelOf(fn, value) {
  if (typeof window[fn] === 'function') return window[fn](value);
  return value || '-';
}

function groupReports(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = typeof window.threadKeyOf === 'function'
      ? window.threadKeyOf(row)
      : `${row.target_type}:${row.target_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.values()].map((items) => {
    const sorted = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { latest: sorted[0], count: sorted.length };
  });
}

export default function ReportsScreen() {
  const [segment, setSegment] = useState('reports');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (segment !== 'reports') return undefined;
    let alive = true;
    setRows(null);
    setError('');
    window.fetchPendingReports?.({})
      .then((list) => {
        if (alive) setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (alive) setError(err?.message || '신고를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [segment]);

  const groups = rows ? groupReports(rows) : [];

  return (
    <div className="m-reports">
      <div className="m-segments" role="tablist">
        {SEGMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={segment === item.id}
            className={segment === item.id ? 'is-active' : ''}
            onClick={() => setSegment(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {segment !== 'reports' ? (
        <p className="m-empty">이 목록은 다음 단계에서 연결합니다.</p>
      ) : null}
      {segment === 'reports' && error ? <p className="m-empty">{error}</p> : null}
      {segment === 'reports' && !error && rows == null ? <p className="m-empty">불러오는 중…</p> : null}
      {segment === 'reports' && rows && groups.length === 0 ? (
        <p className="m-empty">대기 중인 신고가 없습니다.</p>
      ) : null}
      {segment === 'reports' && groups.length > 0 ? (
        <div className="m-cards">
          {groups.map((group) => {
            const row = group.latest;
            const when = typeof window.fmtDate === 'function' ? window.fmtDate(row.created_at) : '';
            return (
              <article key={`${row.target_type}-${row.target_id}`} className="m-card">
                <div className="m-card-top">
                  <span>{labelOf('reportTypeLabel', row.target_type)}</span>
                  <span>{labelOf('statusLabel', row.status)}</span>
                </div>
                <strong>{labelOf('reasonLabel', row.reason)}</strong>
                <p>{row.target_content || row.description || '내용 없음'}</p>
                <div className="m-card-meta">
                  <span>{group.count}건</span>
                  <span>{when}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
