import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';

const SEGMENTS = [
  { id: 'pending', label: '문의 관리' },
  { id: 'processed', label: '처리 이력' },
];

function authorOf(row) {
  if (row?.user_id) return row.author_username || `UID #${row.user_id}`;
  return '비로그인';
}

function whenOf(value) {
  return typeof window.fmtDate === 'function' ? window.fmtDate(value) : '';
}

function statusOf(value) {
  return typeof window.inquiryStatusLabel === 'function' ? window.inquiryStatusLabel(value) : (value || '-');
}

function pendingGroups(rows) {
  if (typeof window.buildInquiryDisplayGroups === 'function') {
    return window.buildInquiryDisplayGroups(rows).map((group) => ({
      key: group.clusterKey,
      head: group.head,
      count: group.items.length,
      ids: group.items.map((row) => row.id),
      duplicate: Boolean(group.isDuplicateCluster && group.items.length > 1),
    }));
  }
  return rows.map((row) => ({
    key: `solo:${row.id}`,
    head: row,
    count: 1,
    ids: [row.id],
    duplicate: false,
  }));
}

export default function InquiriesScreen() {
  const [segment, setSegment] = useState('pending');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    const load = segment === 'processed'
      ? window.fetchProcessedInquiries?.({})
      : window.fetchPendingInquiries?.({});
    Promise.resolve(load)
      .then((list) => {
        if (alive) setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (alive) setError(err?.message || '문의를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [segment, reloadKey]);

  const openSheet = (action, ids) => {
    setNote('');
    setSheet({ action, ids });
  };

  const closeSheet = () => {
    if (saving) return;
    setSheet(null);
  };

  const submitSheet = async () => {
    if (!sheet || saving) return;
    setSaving(true);
    const ok = sheet.action === 'reopen'
      ? await window.submitInquiryReopenDialog?.({ id: sheet.ids[0], note })
      : await window.submitInquiryBulkCloseDialog?.({ ids: sheet.ids, note });
    setSaving(false);
    if (!ok) return;
    setSheet(null);
    setReloadKey((key) => key + 1);
  };

  const groups = segment === 'pending' && rows ? pendingGroups(rows) : [];
  const reopenNeedsNote = sheet?.action === 'reopen' && !note.trim();

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
      {error ? <p className="m-empty">{error}</p> : null}
      {!error && rows == null ? <p className="m-empty">불러오는 중…</p> : null}
      {!error && rows && rows.length === 0 ? (
        <p className="m-empty">{segment === 'processed' ? '처리된 문의가 없습니다.' : '대기 중인 문의가 없습니다.'}</p>
      ) : null}
      {segment === 'pending' && groups.length > 0 ? (
        <div className="m-cards">
          {groups.map((group) => {
            const row = group.head;
            return (
              <article key={group.key} className="m-card">
                <div className="m-card-top">
                  <span>#Q-{row.id}</span>
                  <span>{statusOf(row.status)}</span>
                </div>
                <strong>{authorOf(row)}</strong>
                <p>{row.content || '내용 없음'}</p>
                <div className="m-card-meta">
                  <span>{group.duplicate ? `중복 ${group.count}건` : `${group.count}건`}</span>
                  <span>{row.contact_username || row.contact_email || '연락처 없음'}</span>
                  <span>{whenOf(row.created_at)}</span>
                </div>
                <div className="m-card-actions">
                  <button type="button" className="is-close" onClick={() => openSheet('close', group.ids)}>종결</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {segment === 'processed' && rows && rows.length > 0 ? (
        <div className="m-cards">
          {rows.map((row) => (
            <article key={row.id} className="m-card">
              <div className="m-card-top">
                <span>#Q-{row.id}</span>
                <span>{statusOf(row.status)}</span>
              </div>
              <strong>{authorOf(row)}</strong>
              <p>{row.content || '내용 없음'}</p>
              {row.answer_content ? <p>{row.answer_content}</p> : null}
              <div className="m-card-meta">
                <span>{row.answered_by_username || (row.answered_by ? `admin #${row.answered_by}` : '처리자 없음')}</span>
                <span>{whenOf(row.answered_at || row.updated_at)}</span>
              </div>
              <div className="m-card-actions">
                <button type="button" onClick={() => openSheet('reopen', [row.id])}>재오픈</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <BottomSheet
        open={Boolean(sheet)}
        title={sheet?.action === 'reopen' ? '문의 재오픈' : '문의 종결'}
        onClose={closeSheet}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving || reopenNeedsNote} onClick={submitSheet}>
            {saving ? '처리 중…' : (sheet?.action === 'reopen' ? '재오픈' : `${sheet?.ids?.length || 0}건 종결`)}
          </button>
        )}
      >
        <label className="m-field">
          <span>{sheet?.action === 'reopen' ? '재오픈 사유' : '종결 메모'}</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={sheet?.action === 'reopen' ? '재오픈 사유를 입력하세요' : '종결 메모 (선택)'}
          />
        </label>
      </BottomSheet>
    </div>
  );
}
