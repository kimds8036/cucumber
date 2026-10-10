import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  LayoutGrid,
  Search,
  Smartphone,
  Table2,
  UserRound,
  X,
} from 'lucide-react';
import StatCard from './StatCard.jsx';
import Tag from './Tag.jsx';

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'checkedIn', label: '오늘 등교' },
  { id: 'absent', label: '미등교' },
  { id: 'unverified', label: '미인증' },
  { id: 'ios', label: 'iPhone' },
  { id: 'android', label: 'Android' },
];

const SECTIONS = [
  { id: 'overview', label: '개요', icon: LayoutGrid },
  { id: 'profile', label: '프로필', icon: UserRound },
  { id: 'devices', label: '기기', icon: Smartphone },
  { id: 'badges', label: '배지', icon: BadgeCheck },
  { id: 'attendance', label: '등교', icon: CalendarDays },
  { id: 'timetable', label: '시간표', icon: Table2 },
];

function osLabel(os) {
  if (os === 'ios') return 'iPhone';
  if (os === 'android') return 'Android';
  if (os === 'mixed') return '혼용';
  if (os === 'other') return '기타';
  if (!os || os === '—') return '미확인';
  return os;
}

function seenWithin12h(value) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= 12 * 60 * 60 * 1000;
}

function formatWhen(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function Avatar({ url, name, color, onZoom }) {
  const letter = String(name || '?').slice(0, 1).toUpperCase();
  if (url) {
    return (
      <img
        className={`lookup-avatar ${onZoom ? 'is-zoomable' : ''}`}
        src={url}
        alt=""
        onClick={onZoom ? (event) => { event.stopPropagation(); onZoom(url); } : undefined}
      />
    );
  }
  return (
    <span className="lookup-avatar lookup-avatar-fallback" style={{ background: color || '#1f2833' }}>
      {letter}
    </span>
  );
}

function AttendanceCalendar({ attendance }) {
  const months = attendance?.months || [];
  const dow = ['일', '월', '화', '수', '목', '금', '토'];
  if (!months.length) return <p className="lookup-muted">등교 기록이 없습니다.</p>;
  return (
    <div className="lookup-cals">
      {months.map((month) => (
        <div key={month.label} className="lookup-cal">
          <div className="lookup-cal-title">{month.label}</div>
          <div className="lookup-cal-grid">
            {dow.map((day) => <div key={day} className="lookup-cal-dow">{day}</div>)}
            {(month.weeks || []).flat().map((cell, index) => {
              if (!cell.inMonth) return <div key={`${month.label}-${index}`} className="lookup-cal-cell is-empty" />;
              const cls = [
                'lookup-cal-cell',
                cell.present ? 'is-present' : '',
                !cell.present && cell.schoolDay ? 'is-missed' : '',
                !cell.schoolDay ? 'is-off' : '',
                cell.isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ');
              return <div key={cell.ymd} className={cls} title={cell.ymd}>{cell.day}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserLookup() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], total: 0, totalPages: 1, latestAppVersion: null });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [detail, setDetail] = useState(null);
  const [section, setSection] = useState('overview');
  const [narrowDetail, setNarrowDetail] = useState(false);
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const listRef = useRef(null);
  const scrollRef = useRef(0);

  const loadList = async (nextPage = page, nextQuery = query, nextFilter = filter) => {
    if (typeof window.api !== 'function') return;
    const qs = new URLSearchParams({
      page: String(nextPage),
      limit: '20',
      filter: nextFilter,
    });
    if (nextQuery.trim()) qs.set('q', nextQuery.trim());
    const { data } = await window.api(`/analytics/users-preview?${qs.toString()}`);
    setList({
      items: data?.items || [],
      total: Number(data?.total || 0),
      totalPages: Number(data?.totalPages || 1),
      latestAppVersion: data?.latestAppVersion || null,
    });
    setPage(Number(data?.page || nextPage));
  };

  const loadDetail = async (id, meta) => {
    if (listRef.current) scrollRef.current = listRef.current.scrollTop;
    setSelectedId(id);
    setSelectedMeta(meta || null);
    setSection('overview');
    setNarrowDetail(true);
    setError('');
    try {
      const { data } = await window.api(`/analytics/user-inspect?q=${encodeURIComponent(`#${id}`)}`);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      setError(err?.message || '상세를 불러오지 못했습니다.');
    }
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = scrollRef.current;
    });
  };

  useEffect(() => {
    const open = () => {
      loadList(1, query, filter).catch((err) => setError(err?.message || '목록을 불러오지 못했습니다.'));
    };
    window.addEventListener('admin:user-lookup-open', open);
    if (window.__adminOpsView === 'user') open();
    const onKey = (event) => {
      if (event.key === 'Escape') setPhotoUrl('');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('admin:user-lookup-open', open);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const user = detail?.user;
  const stats = detail?.stats || {};
  const badges = detail?.badges || {};
  const latest = selectedMeta?.isLatestAppVersion;
  const schoolLine = user
    ? `${user.schoolName || '-'}${user.grade != null ? ` · ${user.grade}학년` : ''}${user.classNumber != null ? ` ${user.classNumber}반` : ''}`
    : '';

  const openSanctions = () => {
    if (!user) return;
    const input = document.getElementById('users-search-q');
    if (input) input.value = user.username || String(user.id);
    window.__adminNavItem = 'users';
    window.go?.('users');
    setTimeout(() => {
      if (typeof window.loadUsers === 'function') window.loadUsers();
    }, 0);
  };

  return (
    <div className={`user-lookup ${narrowDetail ? 'is-detail' : ''}`}>
      <aside className="user-lookup-list">
        <form
          className="lookup-search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            loadList(1, query, filter).catch((err) => setError(err?.message || '목록을 불러오지 못했습니다.'));
          }}
        >
          <Search size={14} />
          <input
            value={query}
            placeholder="아이디, 학교명, #번호"
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <div className="lookup-chips">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`lookup-chip ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => {
                setFilter(item.id);
                setPage(1);
                loadList(1, query, item.id).catch((err) => setError(err?.message || '목록을 불러오지 못했습니다.'));
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="lookup-count">총 {list.total.toLocaleString()}명 · {page}/{list.totalPages}</div>
        <div
          className="lookup-rows"
          ref={listRef}
          onScroll={(event) => {
            scrollRef.current = event.currentTarget.scrollTop;
          }}
        >
          {list.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`lookup-row ${selectedId === item.id ? 'is-active' : ''}`}
              onClick={() => loadDetail(item.id, item)}
            >
              <Avatar url={item.avatarUrl} name={item.username} onZoom={setPhotoUrl} />
              <span className="lookup-row-body">
                <strong>@{item.username || '-'} <em>#{item.id}</em></strong>
                <small>{item.schoolName} · {osLabel(item.os)}</small>
                <span className={`lookup-ver ${item.isLatestAppVersion ? 'is-latest' : (item.appVersion && item.appVersion !== '—' ? 'is-old' : 'is-unknown')}`}>
                  {item.isLatestAppVersion
                    ? `v${String(item.appVersion).replace(/^v/i, '')} 최신`
                    : (item.appVersion && item.appVersion !== '—'
                      ? `v${String(item.appVersion).replace(/^v/i, '')} 구버전`
                      : '버전 없음')}
                </span>
              </span>
              <span className={`lookup-dot ${seenWithin12h(item.lastActivityAt) ? 'is-on' : ''}`} title={seenWithin12h(item.lastActivityAt) ? '12시간 이내 접속' : '12시간 이내 접속 없음'} />
            </button>
          ))}
        </div>
        <div className="lookup-pager">
          <button type="button" className="console-text-btn" disabled={page <= 1} onClick={() => loadList(page - 1)}>이전</button>
          <button type="button" className="console-text-btn" disabled={page >= list.totalPages} onClick={() => loadList(page + 1)}>다음</button>
        </div>
      </aside>
      <section className="user-lookup-detail">
        {narrowDetail ? (
          <button type="button" className="lookup-back" onClick={() => setNarrowDetail(false)}>
            <ChevronLeft size={16} /> 목록
          </button>
        ) : null}
        {!user ? <p className="lookup-muted">{error || '왼쪽 목록에서 사용자를 선택하세요.'}</p> : (
          <>
            <article className="lookup-header">
              <Avatar url={user.avatarUrl} name={user.username} color={user.profileColorHex} onZoom={setPhotoUrl} />
              <div className="lookup-header-main">
                <h2>@{user.username} <span>#{user.id}</span></h2>
                <p>{schoolLine}</p>
                <p className="lookup-muted">마지막 접속 {formatWhen(user.lastSeenAt)}</p>
                <div className="lookup-tags">
                  <Tag tone={user.studentVerified ? 'ok' : 'warn'}>{user.studentVerified ? '학생 인증' : '미인증'}</Tag>
                  <Tag>{user.hasGuardianConsent ? '보호자 동의' : '보호자 동의 없음'}</Tag>
                  <Tag>{osLabel(stats.primaryOs)}</Tag>
                  <Tag tone={latest ? 'ok' : 'neutral'}>{latest ? '앱 최신' : '앱 이전/미확인'}</Tag>
                  <Tag tone={stats.todayCheckedIn ? 'ok' : 'warn'}>{stats.todayCheckedIn ? '오늘 등교' : '오늘 미등교'}</Tag>
                </div>
              </div>
              <button type="button" className="lookup-sanction" onClick={openSanctions}>제재 현황에서 열기</button>
            </article>
            <div className="lookup-stats">
              <StatCard label="친구 수" value={Number(stats.friendCount || 0).toLocaleString()} />
              <StatCard label="글 수" value={Number(stats.postCount || 0).toLocaleString()} />
              <StatCard label="댓글 수" value={Number(stats.commentCount || 0).toLocaleString()} />
              <StatCard label="배지 획득/미오픈" value={`${badges.ownedCount || 0}/${badges.lockedCount || 0}`} />
              <StatCard label="최근 2달 등교" value={Number(stats.attendancePresentCount || 0).toLocaleString()} />
            </div>
            <div className="console-subtabs">
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`console-subtab ${section === item.id ? 'is-active' : ''}`}
                    onClick={() => setSection(item.id)}
                  >
                    <Icon size={14} /> {item.label}{item.id === 'profile' ? ' NEW' : ''}
                  </button>
                );
              })}
            </div>
            {section === 'overview' ? (
              <div className="lookup-grid">
                <article className="lookup-card">
                  <h3>프로필 요약</h3>
                  <p>{user.displayName || user.username}</p>
                  <p>{schoolLine}</p>
                  <p className="lookup-muted">가입 {formatWhen(user.createdAt)}</p>
                </article>
                <article className="lookup-card">
                  <h3>기기 요약</h3>
                  <p>{Number(stats.deviceCount || 0)}대 · {osLabel(stats.primaryOs)}</p>
                  <p className="lookup-muted">
                    iPhone {detail.devicePlatforms?.ios || 0} · Android {detail.devicePlatforms?.android || 0}
                  </p>
                </article>
                <article className="lookup-card">
                  <h3>등교</h3>
                  <AttendanceCalendar attendance={detail.attendance} />
                </article>
                <article className="lookup-card">
                  <h3>배지 진행</h3>
                  {(badges.items || []).slice(0, 6).map((badge) => {
                    const current = Number(badge.progress?.current || 0);
                    const target = Number(badge.progress?.target || 0);
                    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                    return (
                      <div key={badge.key || badge.title} className="lookup-bar-row">
                        <span>{badge.title || badge.key}</span>
                        <div className="lookup-bar"><span style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </article>
              </div>
            ) : null}
            {section === 'profile' ? (
              <article className="lookup-card">
                <h3>앱에 보이는 프로필</h3>
                <Avatar url={user.avatarUrl} name={user.username} color={user.profileColorHex} onZoom={setPhotoUrl} />
                <p>아이디 @{user.username}</p>
                <p>이름 {user.displayName || '-'}</p>
                <p>학교 {schoolLine}</p>
                <p>프로필 색 {user.profileColorHex || '-'}</p>
                <p>장착 배지 {badges.equippedBadgeKey || user.equippedBadgeKey || '없음'}</p>
                <p>가입 {formatWhen(user.createdAt)}</p>
                <p className="lookup-muted">소개 문구 필드는 앱 프로필에 없습니다.</p>
              </article>
            ) : null}
            {section === 'devices' ? (
              <div className="console-table-wrap">
                <table className="console-table">
                  <thead>
                    <tr><th>OS</th><th>앱 버전</th><th>푸시</th><th>최근 활동</th><th>기기 ID</th></tr>
                  </thead>
                  <tbody>
                    {(detail.devices || []).length === 0 ? (
                      <tr><td colSpan={5}>기기 기록 없음</td></tr>
                    ) : (detail.devices || []).map((device) => (
                      <tr key={device.deviceId || device.lastSeenAt}>
                        <td>{osLabel(device.os)}</td>
                        <td>{device.appVersion || '-'}</td>
                        <td>{device.pushActive == null ? '-' : (device.pushActive ? '활성' : '비활성')}</td>
                        <td>{formatWhen(device.lastSeenAt || device.lastLoginAt)}</td>
                        <td>{device.deviceId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {section === 'badges' ? (
              <div className="lookup-card">
                {(badges.items || []).map((badge) => {
                  const current = Number(badge.progress?.current || 0);
                  const target = Number(badge.progress?.target || 0);
                  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                  const state = badge.owned ? (badge.equipped ? '장착' : '획득') : '미오픈';
                  return (
                    <div key={badge.key || badge.title} className="lookup-bar-row">
                      <Tag>{state}</Tag>
                      <span>{badge.title || badge.key}</span>
                      <div className="lookup-bar"><span style={{ width: `${pct}%` }} /></div>
                      <small>{target > 0 ? `${current}/${target}` : '-'}</small>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {section === 'attendance' ? (
              <article className="lookup-card">
                <p className="lookup-muted">초록은 체크인, 테두리는 등교일 미체크, 흐린 칸은 주말·방학·휴업입니다.</p>
                <AttendanceCalendar attendance={detail.attendance} />
              </article>
            ) : null}
            {section === 'timetable' ? (
              <article className="lookup-card">
                {detail.timetable?.source?.override ? (
                  <div className="console-table-wrap">
                    <table className="console-table">
                      <thead>
                        <tr>
                          <th>교시</th>
                          {(detail.timetable.days || []).map((day) => <th key={day}>{day}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.timetable.rows || []).map((row) => (
                          <tr key={row.period}>
                            <td>{row.period}</td>
                            {(row.cells || []).map((cell, index) => <td key={`${row.period}-${index}`}>{cell || ''}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>{detail.timetable?.source?.neis ? 'NEIS 있음 · 앱에서 시간표 미사용' : '등록된 시간표가 없습니다.'}</p>
                )}
              </article>
            ) : null}
          </>
        )}
      </section>
      {photoUrl ? (
        <div className="lookup-photo-backdrop" onClick={() => setPhotoUrl('')}>
          <button type="button" className="lookup-photo-close" onClick={() => setPhotoUrl('')} aria-label="닫기">
            <X size={18} />
          </button>
          <img className="lookup-photo-full" src={photoUrl} alt="" onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}
