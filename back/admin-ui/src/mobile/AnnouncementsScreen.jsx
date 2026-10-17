import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';

export default function AnnouncementsScreen() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    window.fetchAnnouncements?.('all')
      .then((list) => {
        if (alive) setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (alive) setError(err?.message || '공지를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const openNew = () => {
    setTitle('');
    setContent('');
    setStatus('draft');
    setSheet({ id: null });
  };

  const openEdit = (row) => {
    setTitle(row.title || '');
    setContent(row.content || '');
    setStatus(row.status || 'draft');
    setSheet({ id: row.id });
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await window.announcementSave?.({ id: sheet?.id, title, content, status });
    setSaving(false);
    if (!ok) return;
    setSheet(null);
    setReloadKey((key) => key + 1);
  };

  const remove = async (row) => {
    const ok = await window.announcementDelete?.(row.id);
    if (!ok) return;
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="m-reports">
      <button type="button" className="m-more-btn" onClick={openNew}>새 공지</button>
      {error ? (
        <div className="m-empty">
          <p>{error}</p>
          <button type="button" className="m-more-btn" onClick={() => setReloadKey((key) => key + 1)}>재시도</button>
        </div>
      ) : null}
      {!error && rows == null ? <p className="m-empty">불러오는 중…</p> : null}
      {!error && rows && rows.length === 0 ? <p className="m-empty">공지가 없습니다.</p> : null}
      {rows && rows.length > 0 ? (
        <div className="m-cards">
          {rows.map((row) => (
            <article key={row.id} className="m-card">
              <div className="m-card-top">
                <span>#{row.id}</span>
                <span>{row.status === 'published' ? '게시' : '초안'}</span>
              </div>
              <strong>{row.title || '제목 없음'}</strong>
              <p>{row.content || ''}</p>
              <div className="m-card-actions">
                <button type="button" onClick={() => openEdit(row)}>수정</button>
                <button type="button" className="is-reject" onClick={() => remove(row)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <BottomSheet
        open={Boolean(sheet)}
        title={sheet?.id ? '공지 수정' : '공지 작성'}
        onClose={() => { if (!saving) setSheet(null); }}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving || !title.trim() || !content.trim()} onClick={save}>
            {saving ? '저장 중…' : '저장'}
          </button>
        )}
      >
        <label className="m-field">
          <span>제목</span>
          <input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="m-field">
          <span>내용</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} />
        </label>
        <label className="m-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="draft">초안</option>
            <option value="published">게시</option>
          </select>
        </label>
      </BottomSheet>
    </div>
  );
}
