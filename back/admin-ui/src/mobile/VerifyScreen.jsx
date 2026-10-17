import { useEffect, useState } from 'react';
import { canAccess } from '../nav.js';
import BottomSheet from './BottomSheet.jsx';
import ImageViewer from './ImageViewer.jsx';

const SEGMENTS = [
  { id: 'studentIds', label: '학생증', panel: 'studentIds' },
  { id: 'certificates', label: '재학증명서', panel: 'certificates' },
  { id: 'reverificationIds', label: '재인증 학생증', panel: 'reverificationIds' },
  { id: 'manualSignup', label: '수동 가입', panel: 'manualSignup' },
];

const REJECT_REASONS = [
  { id: 'blurry', label: '사진 흐림·잘림' },
  { id: 'name_mismatch', label: '이름 불일치' },
  { id: 'school_mismatch', label: '학교 이름 불일치' },
  { id: 'not_student_id', label: '학생증이 아닌 사진' },
  { id: 'custom', label: '기타 (직접 입력)' },
];

function imageSources(row) {
  const raw = String(row?.cloudinary_url || '').trim();
  if (!raw) return [];
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      return [parsed.primary, parsed.secondary].filter(Boolean);
    } catch {
      return [raw];
    }
  }
  return [raw];
}

function PrivateThumb({ source, onOpen }) {
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  if (!source) return <p className="m-card-meta">이미지 없음</p>;
  return (
    <div className="m-thumb-wrap">
      {phase === 'loading' ? <span className="m-skel" /> : null}
      {phase === 'error' ? (
        <div className="m-thumb-error">
          <p>이미지를 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => {
              setPhase('loading');
              setAttempt((value) => value + 1);
            }}
          >
            재시도
          </button>
        </div>
      ) : (
        <button type="button" className="m-thumb" onClick={onOpen} aria-label="학생증 크게 보기">
          <img
            key={attempt}
            alt=""
            src={source}
            onLoad={() => setPhase('ok')}
            onError={() => setPhase('error')}
            style={{ opacity: phase === 'ok' ? 1 : 0 }}
          />
        </button>
      )}
    </div>
  );
}

export default function VerifyScreen({ role }) {
  const segments = SEGMENTS.filter((item) => canAccess(role, item.panel));
  const [segment, setSegment] = useState(segments[0]?.id || 'studentIds');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [viewer, setViewer] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('blurry');
  const [custom, setCustom] = useState('');
  const [idName, setIdName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (segment !== 'studentIds') return undefined;
    let alive = true;
    setRows(null);
    setError('');
    window.fetchStudentIds?.({ status: 'pending' })
      .then((list) => {
        if (alive) setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (alive) setError(err?.message || '학생증을 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [segment, reloadKey]);

  const refresh = async () => {
    try {
      const list = await window.fetchStudentIds?.({ status: 'pending' });
      const next = Array.isArray(list) ? list : [];
      setRows(next);
      setError('');
      window.setNavBadge?.('badge-student-ids', next.length);
    } catch (err) {
      setError(err?.message || '학생증을 불러오지 못했습니다.');
    }
  };

  const approve = async (row) => {
    if (saving) return;
    setSaving(true);
    const ok = await window.approveStudentId?.(row.id, 'signup');
    setSaving(false);
    if (!ok) return;
    setViewer(null);
    await refresh();
  };

  const openReject = (row) => {
    setReason('blurry');
    setCustom('');
    setIdName('');
    setRejecting(row);
  };

  const submitReject = async () => {
    if (!rejecting || saving) return;
    setSaving(true);
    const ok = await window.submitStudentIdReject?.({
      id: rejecting.id,
      reason,
      custom,
      idName,
      registeredName: rejecting.name || '',
      schoolName: rejecting.school_name || '',
    });
    setSaving(false);
    if (!ok) return;
    setRejecting(null);
    setViewer(null);
    await refresh();
  };

  const rejectReady = reason === 'custom' ? custom.trim().length > 0 : reason === 'name_mismatch' ? idName.trim().length > 0 : Boolean(reason);
  const active = viewer ? rows?.find((row) => row.id === viewer.id) : null;

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
      {segment !== 'studentIds' ? <p className="m-empty">이 목록은 다음 단계에서 연결합니다.</p> : null}
      {segment === 'studentIds' && error ? (
        <div className="m-empty">
          <p>{error}</p>
          <button type="button" className="m-more-btn" onClick={() => setReloadKey((key) => key + 1)}>재시도</button>
        </div>
      ) : null}
      {segment === 'studentIds' && !error && rows == null ? <p className="m-empty">불러오는 중…</p> : null}
      {segment === 'studentIds' && rows && rows.length === 0 ? <p className="m-empty">대기 중인 학생증이 없습니다.</p> : null}
      {segment === 'studentIds' && rows && rows.length > 0 ? (
        <div className="m-cards">
          {rows.map((row) => {
            const sources = imageSources(row);
            return (
              <article key={row.id} className="m-card">
                <div className="m-card-top">
                  <span>{row.name || '-'}</span>
                  <span>@{row.username || '-'}</span>
                </div>
                <strong>{row.school_name || '학교 없음'}</strong>
                <p>{[row.birth_date || '생년월일 없음', row.phone || '전화 없음'].join(' · ')}</p>
                <div className="m-thumbs">
                  {sources.length === 0 ? <p className="m-card-meta">이미지 없음</p> : sources.map((source, index) => (
                    <PrivateThumb key={`${row.id}-${index}`} source={source} onOpen={() => setViewer({ id: row.id, index })} />
                  ))}
                </div>
                <div className="m-card-actions">
                  <button type="button" className="is-confirm" disabled={saving} onClick={() => approve(row)}>승인</button>
                  <button type="button" className="is-reject" disabled={saving} onClick={() => openReject(row)}>거절</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      <ImageViewer
        open={Boolean(viewer && active)}
        source={viewer && active ? imageSources(active)[viewer.index] : ''}
        onClose={() => setViewer(null)}
        footer={active ? (
          <>
            <button type="button" className="is-confirm" disabled={saving} onClick={() => approve(active)}>승인</button>
            <button type="button" className="is-reject" disabled={saving} onClick={() => openReject(active)}>거절</button>
          </>
        ) : null}
      />
      <BottomSheet
        open={Boolean(rejecting)}
        title="학생증 거절"
        onClose={() => { if (!saving) setRejecting(null); }}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving || !rejectReady} onClick={submitReject}>
            {saving ? '처리 중…' : '거절'}
          </button>
        )}
      >
        <label className="m-field">
          <span>거절 사유</span>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            {REJECT_REASONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        {reason === 'name_mismatch' ? (
          <label className="m-field">
            <span>등록된 이름: {rejecting?.name || '-'}</span>
            <input value={idName} onChange={(event) => setIdName(event.target.value)} placeholder="학생증에 적힌 이름" />
          </label>
        ) : null}
        {reason === 'custom' ? (
          <label className="m-field">
            <span>직접 입력</span>
            <textarea value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="거절 사유를 입력하세요" />
          </label>
        ) : null}
      </BottomSheet>
    </div>
  );
}
