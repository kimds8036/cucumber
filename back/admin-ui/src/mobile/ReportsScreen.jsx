import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';

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
    return { latest: sorted[0], count: sorted.length, ids: sorted.map((row) => row.id) };
  });
}

export default function ReportsScreen() {
  const [segment, setSegment] = useState('reports');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [note, setNote] = useState('');
  const [malicious, setMalicious] = useState(false);
  const [saving, setSaving] = useState(false);

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
  }, [segment, reloadKey]);

  const openSheet = (action, ids) => {
    setNote('');
    setMalicious(false);
    setSheet({ action, ids });
  };

  const closeSheet = () => {
    if (saving) return;
    setSheet(null);
  };

  const submitSheet = async () => {
    if (!sheet || saving) return;
    setSaving(true);
    const payload = { note, malicious: sheet.action === 'reject' && malicious };
    const ok = sheet.ids.length === 1
      ? await window.doAction?.(sheet.ids[0], sheet.action, payload)
      : await window.submitBulkActionDialog?.({
        action: sheet.action,
        ids: sheet.ids,
        note,
        malicious: payload.malicious,
      });
    setSaving(false);
    if (!ok) return;
    setSheet(null);
    setReloadKey((key) => key + 1);
  };

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
                <div className="m-card-actions">
                  <button type="button" className="is-confirm" onClick={() => openSheet('confirm', group.ids)}>확정</button>
                  <button type="button" className="is-reject" onClick={() => openSheet('reject', group.ids)}>기각</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      <BottomSheet
        open={Boolean(sheet)}
        title={sheet?.action === 'reject' ? '신고 기각' : '신고 확정'}
        onClose={closeSheet}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving} onClick={submitSheet}>
            {saving ? '처리 중…' : `${sheet?.ids?.length || 0}건 처리`}
          </button>
        )}
      >
        <label className="m-field">
          <span>판정 메모</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="판정 메모를 입력하세요" />
        </label>
        {sheet?.action === 'reject' ? (
          <label className="m-check">
            <input type="checkbox" checked={malicious} onChange={(event) => setMalicious(event.target.checked)} />
            악의적 허위 신고로 판정
          </label>
        ) : null}
      </BottomSheet>
    </div>
  );
}
