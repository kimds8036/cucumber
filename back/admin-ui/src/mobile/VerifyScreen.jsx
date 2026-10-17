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

const EMPTY = {
  studentIds: '대기 중인 학생증이 없습니다.',
  certificates: '대기 중인 재학증명서가 없습니다.',
  reverificationIds: '대기 중인 재인증 학생증이 없습니다.',
};

function imageSources(row, segment) {
  if (segment === 'certificates') {
    return row?.certificate_view_url ? [row.certificate_view_url] : [];
  }
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
        <button type="button" className="m-thumb" onClick={onOpen} aria-label="크게 보기">
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

const blankSignup = () => ({
  username: '',
  password: '',
  password2: '',
  name: '',
  phone: '',
  birthDate: '',
  grade: '1',
  classNumber: '1',
  colorId: '1',
  studentVerified: false,
  adminNote: '',
  schoolQuery: '',
  school: null,
  schools: [],
});

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
  const [note, setNote] = useState('');
  const [schoolIds, setSchoolIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signup, setSignup] = useState(blankSignup);

  const listKind = segment === 'reverificationIds' ? 'reverification' : 'signup';
  const badgeKey = segment === 'certificates'
    ? 'badge-certificates'
    : segment === 'reverificationIds'
      ? 'badge-reverification-ids'
      : 'badge-student-ids';

  useEffect(() => {
    if (segment === 'manualSignup') return undefined;
    let alive = true;
    setRows(null);
    setError('');
    const loader = segment === 'certificates'
      ? window.fetchCertificates?.({ status: 'pending' })
      : segment === 'reverificationIds'
        ? window.fetchReverificationIds?.({ status: 'pending' })
        : window.fetchStudentIds?.({ status: 'pending' });
    Promise.resolve(loader)
      .then((list) => {
        if (alive) setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (alive) setError(err?.message || '목록을 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [segment, reloadKey]);

  const refresh = async () => {
    const loader = segment === 'certificates'
      ? window.fetchCertificates?.({ status: 'pending' })
      : segment === 'reverificationIds'
        ? window.fetchReverificationIds?.({ status: 'pending' })
        : window.fetchStudentIds?.({ status: 'pending' });
    const list = await loader;
    const next = Array.isArray(list) ? list : [];
    setRows(next);
    setError('');
    window.setNavBadge?.(badgeKey, next.length);
  };

  const approve = async (row) => {
    if (saving) return;
    setSaving(true);
    const ok = segment === 'certificates'
      ? await window.approveCertificate?.(row.id, { schoolId: schoolIds[row.id] || '' })
      : await window.approveStudentId?.(row.id, listKind);
    setSaving(false);
    if (!ok) return;
    setViewer(null);
    setSchoolIds((current) => ({ ...current, [row.id]: '' }));
    await refresh();
  };

  const openReject = (row) => {
    setReason('blurry');
    setCustom('');
    setIdName('');
    setNote('');
    setRejecting(row);
  };

  const submitReject = async () => {
    if (!rejecting || saving) return;
    setSaving(true);
    const ok = segment === 'certificates'
      ? await window.submitCertificateReject?.({ id: rejecting.id, note })
      : await window.submitStudentIdReject?.({
        id: rejecting.id,
        reason,
        custom,
        idName,
        registeredName: rejecting.name || '',
        schoolName: rejecting.school_name || '',
        listKind,
      });
    setSaving(false);
    if (!ok) return;
    setRejecting(null);
    setViewer(null);
    await refresh();
  };

  const rejectReady = segment === 'certificates'
    ? note.trim().length > 0
    : reason === 'custom'
      ? custom.trim().length > 0
      : reason === 'name_mismatch'
        ? idName.trim().length > 0
        : Boolean(reason);

  const active = viewer ? rows?.find((row) => row.id === viewer.id) : null;
  const setField = (key, value) => setSignup((current) => ({ ...current, [key]: value }));

  const searchSchools = async () => {
    try {
      const schools = await window.searchManualSignupSchools?.(signup.schoolQuery);
      setSignup((current) => ({ ...current, schools: Array.isArray(schools) ? schools : [] }));
    } catch (err) {
      window.appAlert?.(err?.message || '학교 검색에 실패했습니다.');
    }
  };

  const createAccount = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await window.submitManualSignup?.({
      username: signup.username,
      password: signup.password,
      password2: signup.password2,
      name: signup.name,
      phone: signup.phone,
      birthDate: signup.birthDate,
      grade: signup.grade,
      classNumber: signup.classNumber,
      colorId: signup.colorId,
      studentVerified: signup.studentVerified,
      adminNote: signup.adminNote,
      school: signup.school,
    });
    setSaving(false);
    if (!ok) return;
    setSignup(blankSignup());
    setSignupOpen(false);
  };

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
            onClick={() => {
              setSegment(item.id);
              setViewer(null);
              setRejecting(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {segment === 'manualSignup' ? (
        <button type="button" className="m-more-btn" onClick={() => setSignupOpen(true)}>계정 만들기</button>
      ) : null}
      {segment !== 'manualSignup' && error ? (
        <div className="m-empty">
          <p>{error}</p>
          <button type="button" className="m-more-btn" onClick={() => setReloadKey((key) => key + 1)}>재시도</button>
        </div>
      ) : null}
      {segment !== 'manualSignup' && !error && rows == null ? <p className="m-empty">불러오는 중…</p> : null}
      {segment !== 'manualSignup' && rows && rows.length === 0 ? <p className="m-empty">{EMPTY[segment]}</p> : null}
      {segment !== 'manualSignup' && rows && rows.length > 0 ? (
        <div className="m-cards">
          {rows.map((row) => {
            const sources = imageSources(row, segment);
            return (
              <article key={row.id} className="m-card">
                <div className="m-card-top">
                  <span>{row.name || '-'}</span>
                  <span>@{row.username || '-'}</span>
                </div>
                <strong>{row.school_name || row.claimed_school_name || '학교 없음'}</strong>
                <p>{[row.birth_date || '생년월일 없음', row.phone || '전화 없음'].join(' · ')}</p>
                {segment === 'certificates' && row.certificate_access_code ? (
                  <p className="m-card-meta">열람 번호 {row.certificate_access_code}</p>
                ) : null}
                {segment === 'certificates' ? (
                  <label className="m-field">
                    <span>승인 시 학교 ID (선택)</span>
                    <input value={schoolIds[row.id] || ''} onChange={(event) => setSchoolIds((current) => ({ ...current, [row.id]: event.target.value }))} inputMode="numeric" />
                  </label>
                ) : null}
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
        source={viewer && active ? imageSources(active, segment)[viewer.index] : ''}
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
        title={segment === 'certificates' ? '재학증명서 거절' : '학생증 거절'}
        onClose={() => { if (!saving) setRejecting(null); }}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving || !rejectReady} onClick={submitReject}>
            {saving ? '처리 중…' : '거절'}
          </button>
        )}
      >
        {segment === 'certificates' ? (
          <label className="m-field">
            <span>거절 메모</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="거절 사유를 입력하세요" />
          </label>
        ) : (
          <>
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
          </>
        )}
      </BottomSheet>
      <BottomSheet
        open={signupOpen}
        title="수동 가입"
        onClose={() => { if (!saving) setSignupOpen(false); }}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving} onClick={createAccount}>
            {saving ? '만드는 중…' : '계정 생성'}
          </button>
        )}
      >
        <label className="m-field"><span>아이디 (영문·숫자·_ 3~20)</span><input value={signup.username} onChange={(event) => setField('username', event.target.value)} autoComplete="off" /></label>
        <label className="m-field"><span>비밀번호 (8자+, 영문+숫자)</span><input type="password" value={signup.password} onChange={(event) => setField('password', event.target.value)} autoComplete="new-password" /></label>
        <label className="m-field"><span>비밀번호 확인</span><input type="password" value={signup.password2} onChange={(event) => setField('password2', event.target.value)} autoComplete="new-password" /></label>
        <label className="m-field"><span>이름</span><input value={signup.name} onChange={(event) => setField('name', event.target.value)} /></label>
        <label className="m-field"><span>휴대폰</span><input value={signup.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="010-1234-5678" inputMode="tel" /></label>
        <label className="m-field"><span>생년월일 (만 6세+)</span><input value={signup.birthDate} onChange={(event) => setField('birthDate', event.target.value)} placeholder="YYYY-MM-DD" /></label>
        <label className="m-field"><span>학년</span>
          <select value={signup.grade} onChange={(event) => setField('grade', event.target.value)}>
            {['1', '2', '3', '4', '5', '6'].map((value) => <option key={value} value={value}>{value}학년</option>)}
          </select>
        </label>
        <label className="m-field"><span>반</span><input type="number" min="1" max="50" value={signup.classNumber} onChange={(event) => setField('classNumber', event.target.value)} /></label>
        <label className="m-field"><span>프로필 색</span>
          <select value={signup.colorId} onChange={(event) => setField('colorId', event.target.value)}>
            {['1', '2', '3', '4'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="m-field"><span>학교 검색</span><input value={signup.schoolQuery} onChange={(event) => setField('schoolQuery', event.target.value)} /></label>
        <button type="button" className="m-more-btn" onClick={searchSchools}>학교 검색</button>
        {(signup.schools || []).map((school) => (
          <button key={school.id} type="button" className="m-more-btn" onClick={() => setField('school', school)}>{school.name}</button>
        ))}
        <p className="m-card-meta">{signup.school ? `선택: ${signup.school.name}` : '학교 없음 · 미인증'}</p>
        <label className="m-field">
          <span>학생 인증 완료 (학교 필수)</span>
          <input type="checkbox" checked={signup.studentVerified} onChange={(event) => setField('studentVerified', event.target.checked)} />
        </label>
        <label className="m-field"><span>생성 사유 (4자 이상)</span><textarea value={signup.adminNote} onChange={(event) => setField('adminNote', event.target.value)} /></label>
      </BottomSheet>
    </div>
  );
}
