import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';

const FLAG_LABELS = {
  signup_disabled: '회원가입 중단',
  post_write_disabled: '게시글 작성 중단',
  comment_write_disabled: '댓글 작성 중단',
  report_submission_disabled: '신고 접수 중단',
  global_readonly: '전역 읽기 전용',
  rate_limit_strict_mode: 'API 제한 강화',
};

const CONFIRM_PHRASE = '비상 스위치 적용';

function ListState({ error, rows, empty, onRetry }) {
  if (error) {
    return (
      <div className="m-empty">
        <p>{error}</p>
        <button type="button" className="m-more-btn" onClick={onRetry}>재시도</button>
      </div>
    );
  }
  if (rows == null) return <p className="m-empty">불러오는 중…</p>;
  if (!rows.length) return <p className="m-empty">{empty}</p>;
  return null;
}

export function TipsScreen() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    window.fetchTips?.('all')
      .then((list) => { if (alive) setRows(Array.isArray(list) ? list : []); })
      .catch((err) => { if (alive) setError(err?.message || '팁을 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [reloadKey]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await window.tipSave?.({ id: sheet?.id || null, body, status });
    setSaving(false);
    if (!ok) return;
    setSheet(null);
    setReloadKey((key) => key + 1);
  };

  const remove = async (row) => {
    const ok = await window.tipDelete?.(row.id);
    if (ok) setReloadKey((key) => key + 1);
  };

  const blocked = ListState({ error, rows, empty: '팁이 없습니다.', onRetry: () => setReloadKey((key) => key + 1) });

  return (
    <div className="m-reports">
      <button type="button" className="m-more-btn" onClick={() => { setBody(''); setStatus('draft'); setSheet({ id: null }); }}>새 팁</button>
      {blocked || (
        <div className="m-cards">
          {rows.map((row) => (
            <article key={row.id} className="m-card">
              <div className="m-card-top"><span>#{row.id}</span><span>{row.status === 'active' ? '활성' : '초안'}</span></div>
              <p>{row.body}</p>
              <div className="m-card-actions">
                <button type="button" onClick={() => { setBody(row.body || ''); setStatus(row.status || 'draft'); setSheet({ id: row.id }); }}>수정</button>
                <button type="button" className="is-reject" onClick={() => remove(row)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <BottomSheet
        open={Boolean(sheet)}
        title={sheet?.id ? `팁 #${sheet.id}` : '새 팁'}
        onClose={() => { if (!saving) setSheet(null); }}
        footer={<button type="button" className="m-sheet-submit" disabled={saving || !body.trim()} onClick={save}>{saving ? '저장 중…' : '저장'}</button>}
      >
        <label className="m-field"><span>문구</span><textarea maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <label className="m-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="draft">초안</option>
            <option value="active">활성</option>
          </select>
        </label>
      </BottomSheet>
    </div>
  );
}

export function HashtagsScreen() {
  const [rows, setRows] = useState(null);
  const [used, setUsed] = useState([]);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    window.fetchRecommendedHashtags?.()
      .then((data) => {
        if (!alive) return;
        setRows(data?.items || []);
        setUsed(data?.used || []);
      })
      .catch((err) => { if (alive) setError(err?.message || '해시태그를 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [reloadKey]);

  const add = async (value) => {
    const next = String(value || name).trim();
    if (!next || saving) return;
    setSaving(true);
    try {
      await window.addRecommendedHashtagName?.(next);
      setOpen(false);
      setName('');
      setReloadKey((key) => key + 1);
    } catch (err) {
      window.appAlert?.(err?.message || '추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const blocked = ListState({ error, rows, empty: '추천 해시태그가 없습니다.', onRetry: () => setReloadKey((key) => key + 1) });

  return (
    <div className="m-reports">
      <button type="button" className="m-more-btn" onClick={() => setOpen(true)}>추가</button>
      {blocked || (
        <div className="m-cards">
          {rows.map((row) => (
            <article key={row.id} className="m-card">
              <strong>#{row.name}</strong>
              <div className="m-card-actions">
                <button type="button" className="is-reject" onClick={async () => { await window.onDeleteRecommendedHashtag?.(row.id); setReloadKey((key) => key + 1); }}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <BottomSheet
        open={open}
        title="추천 해시태그"
        onClose={() => { if (!saving) setOpen(false); }}
        footer={<button type="button" className="m-sheet-submit" disabled={saving || !name.trim()} onClick={() => add(name)}>추가</button>}
      >
        <label className="m-field">
          <span>사용된 해시태그</span>
          <select value="" onChange={(event) => add(event.target.value)}>
            <option value="">선택</option>
            {used.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label className="m-field"><span>직접 입력 (최대 30자)</span><input maxLength={30} value={name} onChange={(event) => setName(event.target.value)} /></label>
      </BottomSheet>
    </div>
  );
}

export function WhackScreen() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [status, setStatus] = useState('none');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    window.fetchHallOfFame?.('')
      .then((data) => { if (alive) setRows(data?.groups || []); })
      .catch((err) => { if (alive) setError(err?.message || '회초리를 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [reloadKey]);

  const save = async () => {
    if (!sheet || saving) return;
    setSaving(true);
    const ok = await window.whackSaveResponse?.({ id: sheet.id, status, text });
    setSaving(false);
    if (!ok) return;
    setSheet(null);
    setReloadKey((key) => key + 1);
  };

  const blocked = ListState({ error, rows, empty: '제보가 없습니다.', onRetry: () => setReloadKey((key) => key + 1) });

  return (
    <div className="m-reports">
      <p className="m-card-meta">개별 제보 묶기는 PC에서 확인해주세요.</p>
      {blocked || (
        <div className="m-cards">
          {rows.map((row) => (
            <article key={row.id} className="m-card">
              <div className="m-card-top"><span>G#{row.id}</span><span>{row.adminResponseStatus || '검토 중'}</span></div>
              <strong>{row.content || '제보'}</strong>
              <div className="m-card-actions">
                <button type="button" onClick={() => { setStatus(row.adminResponseStatus || 'none'); setText(row.adminResponse || ''); setSheet(row); }}>답변</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <BottomSheet
        open={Boolean(sheet)}
        title={sheet ? `G#${sheet.id} 답변` : '답변'}
        onClose={() => { if (!saving) setSheet(null); }}
        footer={<button type="button" className="m-sheet-submit" disabled={saving} onClick={save}>{saving ? '저장 중…' : '저장'}</button>}
      >
        <label className="m-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="none">검토 중</option>
            <option value="planned">도입 예정</option>
            <option value="fixed">반영 완료</option>
            <option value="declined">도입 불가</option>
          </select>
        </label>
        <label className="m-field"><span>답변</span><textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      </BottomSheet>
    </div>
  );
}

export function LogsScreen() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    window.fetchLogs?.({ page: 1, limit: 50 })
      .then((data) => { if (alive) setRows(data?.logs || []); })
      .catch((err) => { if (alive) setError(err?.message || '변경 이력을 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [reloadKey]);

  const blocked = ListState({ error, rows, empty: '변경 이력이 없습니다.', onRetry: () => setReloadKey((key) => key + 1) });
  const visible = (rows || []).slice(0, shown);

  return (
    <div className="m-reports">
      {blocked || (
        <div className="m-cards">
          {visible.map((row) => (
            <article key={row.id || `${row.created_at}-${row.target_id}`} className="m-card">
              <div className="m-card-top"><span>admin #{row.admin_user_id}</span><span>{row.action_type}</span></div>
              <strong>{row.target_type} #{row.target_id}</strong>
              <p>{row.note || '-'}</p>
            </article>
          ))}
        </div>
      )}
      {rows && rows.length > shown ? <button type="button" className="m-more-btn" onClick={() => setShown((value) => value + 10)}>더 보기</button> : null}
    </div>
  );
}

export function EmergencyScreen({ role }) {
  const [flags, setFlags] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [note, setNote] = useState('');
  const [otp, setOtp] = useState('');
  const [phrase, setPhrase] = useState('');
  const [schools, setSchools] = useState('');
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role !== 'super') return undefined;
    let alive = true;
    setFlags(null);
    setError('');
    window.fetchEmergencyFlags?.()
      .then((data) => {
        if (!alive) return;
        setFlags(data || {});
        setDraft(data || {});
        setSchools((data?.locked_school_ids || []).join(', '));
        setMessage(data?.maintenance_message || '');
      })
      .catch((err) => { if (alive) setError(err?.message || '비상 제어를 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [role, reloadKey]);

  if (role !== 'super') return <p className="m-empty">최고관리자만 볼 수 있습니다.</p>;
  if (error) {
    return (
      <div className="m-empty">
        <p>{error}</p>
        <button type="button" className="m-more-btn" onClick={() => setReloadKey((key) => key + 1)}>재시도</button>
      </div>
    );
  }
  if (!flags) return <p className="m-empty">불러오는 중…</p>;

  const onCount = Object.keys(FLAG_LABELS).filter((key) => flags[key]).length;

  const apply = async () => {
    if (phrase !== CONFIRM_PHRASE) {
      window.appAlert?.(`확인 문구를 그대로 입력해 주세요. (${CONFIRM_PHRASE})`);
      return;
    }
    setSaving(true);
    const locked = schools.split(/[,\s]+/).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
    const ok = await window.saveEmergencyFlags?.({
      note,
      confirmOtp: otp,
      flags: {
        ...Object.fromEntries(Object.keys(FLAG_LABELS).map((key) => [key, Boolean(draft[key])])),
        locked_school_ids: locked,
        maintenance_message: message.trim(),
      },
    });
    setSaving(false);
    if (!ok) return;
    setNote('');
    setOtp('');
    setPhrase('');
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="m-reports">
      <article className="m-card">
        <strong>{onCount > 0 ? `켜짐 ${onCount}개` : '모두 꺼짐'}</strong>
        <p>{Object.keys(FLAG_LABELS).map((key) => `${FLAG_LABELS[key]} ${flags[key] ? '켜짐' : '꺼짐'}`).join(' · ')}</p>
      </article>
      {Object.keys(FLAG_LABELS).map((key) => (
        <label key={key} className="m-field">
          <span>{FLAG_LABELS[key]}</span>
          <input type="checkbox" checked={Boolean(draft[key])} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))} />
        </label>
      ))}
      <label className="m-field"><span>잠긴 학교 ID</span><input value={schools} onChange={(event) => setSchools(event.target.value)} /></label>
      <label className="m-field"><span>안내 메시지</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <label className="m-field"><span>변경 사유</span><input value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <label className="m-field"><span>OTP 6자리</span><input value={otp} inputMode="numeric" maxLength={6} onChange={(event) => setOtp(event.target.value)} /></label>
      <label className="m-field"><span>확인 문구 ({CONFIRM_PHRASE})</span><input value={phrase} onChange={(event) => setPhrase(event.target.value)} /></label>
      <button type="button" className="m-sheet-submit" disabled={saving || phrase !== CONFIRM_PHRASE || note.trim().length === 0 || otp.trim().length !== 6} onClick={apply}>
        {saving ? '적용 중…' : '비상 스위치 적용'}
      </button>
    </div>
  );
}
