import { useEffect, useState } from 'react';
import { canAccess } from '../nav.js';
import BottomSheet from './BottomSheet.jsx';

const SEGMENTS = [
  { id: 'reports', label: '신고 관리', panel: 'reports' },
  { id: 'processedReports', label: '처리 이력', panel: 'processedReports' },
  { id: 'appeals', label: '이의신청', panel: 'appeals' },
  { id: 'users', label: '제재 현황', panel: 'users' },
];

function labelOf(fn, value) {
  if (typeof window[fn] === 'function') return window[fn](value);
  return value || '-';
}

function whenOf(value) {
  return typeof window.fmtDate === 'function' ? window.fmtDate(value) : '';
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

function sanctionOf(user) {
  const reasons = [];
  if (user.is_banned) reasons.push('영구 정지');
  else if (user.is_suspended) reasons.push('임시 정지');
  if (user.is_shadow_muted) reasons.push('섀도우 뮤트');
  if (user.is_whitelisted) reasons.push('화이트리스트');
  if (Number(user.violation_warning_count || 0) > 0) reasons.push(`위반 경고 ${user.violation_warning_count}`);
  if (!reasons.length) return null;
  let period = '-';
  if (user.is_banned) period = '무기한';
  else if (user.suspended_until) period = whenOf(user.suspended_until);
  return { reasons: reasons.join(' · '), period };
}

export default function ReportsScreen({ role }) {
  const segments = SEGMENTS.filter((item) => canAccess(role, item.panel));
  const [segment, setSegment] = useState(segments[0]?.id || 'reports');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [shown, setShown] = useState(10);
  const [sheet, setSheet] = useState(null);
  const [note, setNote] = useState('');
  const [malicious, setMalicious] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    setShown(10);
    const load = segment === 'processedReports'
      ? window.fetchProcessedReports?.({})
      : segment === 'appeals'
        ? window.fetchAppeals?.()
        : segment === 'users'
          ? window.fetchUsers?.({})
          : window.fetchPendingReports?.({});
    Promise.resolve(load)
      .then((list) => {
        if (!alive) return;
        const next = Array.isArray(list) ? list : [];
        setRows(segment === 'users' ? next.filter((user) => sanctionOf(user)) : next);
      })
      .catch((err) => {
        if (alive) setError(err?.message || '목록을 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [segment, reloadKey]);

  const openSheet = (action, ids) => {
    setNote('');
    setMalicious(false);
    setSheet({ kind: 'report', action, ids });
  };

  const closeSheet = () => {
    if (saving) return;
    setSheet(null);
  };

  const submitSheet = async () => {
    if (!sheet || saving) return;
    setSaving(true);
    let ok = false;
    if (sheet.kind === 'reopen') {
      ok = await window.submitReopenDialog?.({ note, reportId: sheet.id });
    } else if (sheet.kind === 'appeal') {
      ok = await window.appealAction?.(sheet.id, sheet.action, { note });
    } else {
      const payload = { note, malicious: sheet.action === 'reject' && malicious };
      ok = sheet.ids.length === 1
        ? await window.doAction?.(sheet.ids[0], sheet.action, payload)
        : await window.submitBulkActionDialog?.({
          action: sheet.action,
          ids: sheet.ids,
          note,
          malicious: payload.malicious,
        });
    }
    setSaving(false);
    if (!ok) return;
    setSheet(null);
    setReloadKey((key) => key + 1);
  };

  const groups = segment === 'reports' && rows ? groupReports(rows) : [];
  const visibleRows = (rows || []).slice(0, shown);
  const reopenBlocked = sheet?.kind === 'reopen' && !note.trim();
  const sheetTitle = sheet?.kind === 'reopen'
    ? '신고 재오픈'
    : sheet?.kind === 'appeal'
      ? (sheet.action === 'accepted' ? '이의신청 승인' : '이의신청 반려')
      : (sheet?.action === 'reject' ? '신고 기각' : '신고 확정');

  return (
    <div className="m-reports">
      <div className="m-segments" role="tablist">
        {segments.map((item) => (
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
      {error ? (
        <div className="m-empty">
          <p>{error}</p>
          <button type="button" className="m-more-btn" onClick={() => setReloadKey((key) => key + 1)}>재시도</button>
        </div>
      ) : null}
      {!error && rows == null ? <p className="m-empty">불러오는 중…</p> : null}
      {!error && segment === 'reports' && rows && groups.length === 0 ? (
        <p className="m-empty">대기 중인 신고가 없습니다.</p>
      ) : null}
      {!error && segment === 'processedReports' && rows && rows.length === 0 ? (
        <p className="m-empty">처리 이력이 없습니다.</p>
      ) : null}
      {!error && segment === 'appeals' && rows && rows.length === 0 ? (
        <p className="m-empty">이의신청이 없습니다.</p>
      ) : null}
      {!error && segment === 'users' && rows && rows.length === 0 ? (
        <p className="m-empty">제재 중인 사용자가 없습니다.</p>
      ) : null}
      {segment === 'reports' && groups.length > 0 ? (
        <div className="m-cards">
          {groups.map((group) => {
            const row = group.latest;
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
                  <span>{whenOf(row.created_at)}</span>
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
      {segment === 'processedReports' && visibleRows.length > 0 ? (
        <div className="m-cards">
          {visibleRows.map((row) => (
            <article key={row.id} className="m-card">
              <div className="m-card-top">
                <span>{labelOf('reportTypeLabel', row.target_type)}</span>
                <span>{labelOf('statusLabel', row.status)}</span>
              </div>
              <strong>{labelOf('reasonLabel', row.reason)}</strong>
              <p>{row.target_content || row.description || '내용 없음'}</p>
              <div className="m-card-meta">
                <span>#{row.id}</span>
                <span>{whenOf(row.reviewed_at || row.created_at)}</span>
              </div>
              <div className="m-card-actions">
                <button
                  type="button"
                  onClick={() => {
                    setNote('');
                    setSheet({ kind: 'reopen', id: row.id });
                  }}
                >
                  재오픈
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {segment === 'appeals' && visibleRows.length > 0 ? (
        <div className="m-cards">
          {visibleRows.map((row) => {
            const open = row.status !== 'accepted' && row.status !== 'rejected';
            return (
              <article key={row.id} className="m-card">
                <div className="m-card-top">
                  <span>#A-{row.id}</span>
                  <span>{labelOf('statusLabel', row.status)}</span>
                </div>
                <strong>게시글 #{row.post_id}</strong>
                <p>{row.content || '내용 없음'}</p>
                <div className="m-card-meta">
                  <span>UID #{row.appellant_id}</span>
                  <span>{whenOf(row.created_at)}</span>
                </div>
                {open ? (
                  <div className="m-card-actions">
                    <button
                      type="button"
                      className="is-confirm"
                      onClick={() => {
                        setNote('');
                        setSheet({ kind: 'appeal', id: row.id, action: 'accepted' });
                      }}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="is-reject"
                      onClick={() => {
                        setNote('');
                        setSheet({ kind: 'appeal', id: row.id, action: 'rejected' });
                      }}
                    >
                      반려
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
      {segment === 'users' && visibleRows.length > 0 ? (
        <div className="m-cards">
          {visibleRows.map((user) => {
            const sanction = sanctionOf(user);
            return (
              <article key={user.id} className="m-card">
                <div className="m-card-top">
                  <span>대상</span>
                  <span>UID #{user.id}</span>
                </div>
                <strong>@{user.username || user.name || '-'}</strong>
                <p>{sanction?.reasons}</p>
                <div className="m-card-meta">
                  <span>기간</span>
                  <span>{sanction?.period}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {!error && segment !== 'reports' && rows && rows.length > shown ? (
        <button type="button" className="m-more-btn" onClick={() => setShown((count) => count + 10)}>더 보기</button>
      ) : null}
      <BottomSheet
        open={Boolean(sheet)}
        title={sheetTitle}
        onClose={closeSheet}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving || reopenBlocked} onClick={submitSheet}>
            {saving ? '처리 중…' : '처리'}
          </button>
        )}
      >
        <label className="m-field">
          <span>{sheet?.kind === 'reopen' ? '재오픈 사유' : '검토 메모'}</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={sheet?.kind === 'reopen' ? '재오픈 사유를 입력하세요' : '검토 메모를 입력하세요'}
          />
        </label>
        {sheet?.kind === 'report' && sheet?.action === 'reject' ? (
          <label className="m-check">
            <input type="checkbox" checked={malicious} onChange={(event) => setMalicious(event.target.checked)} />
            악의적 허위 신고로 판정
          </label>
        ) : null}
      </BottomSheet>
    </div>
  );
}
