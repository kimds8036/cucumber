import { useMemo, useState } from 'react';
import { NAV_GROUPS, canAccess, visibleItems } from '../nav.js';
import HomeScreen from './HomeScreen.jsx';
import ReportsScreen from './ReportsScreen.jsx';

const TABS = [
  { id: 'home', label: '홈' },
  { id: 'reports', label: '신고' },
  { id: 'inquiries', label: '문의' },
  { id: 'verify', label: '인증' },
  { id: 'more', label: '더보기' },
];

const PC_ONLY = new Set([
  'ops-user',
  'ops-timer',
  'ops-study',
  'ops-activity',
  'ops-jobs',
  'ops-terms',
  'ops-map',
  'ops-reach',
  'ops-funnel',
  'legalDocuments',
  'adminAccounts',
  'featureTests',
]);

const IN_TABS = new Set([
  'dashboard',
  'reports',
  'processedReports',
  'appeals',
  'users',
  'inquiries',
  'processedInquiries',
  'studentIds',
  'certificates',
  'reverificationIds',
  'manualSignup',
]);

export default function MobileShell({ role, name, sessionLabel, onLogout, onExtend }) {
  const [tab, setTab] = useState('home');
  const [notice, setNotice] = useState(null);

  const moreGroups = useMemo(
    () => NAV_GROUPS.map((group) => ({
      ...group,
      items: visibleItems(group, role).filter((item) => !IN_TABS.has(item.id)),
    })).filter((group) => group.items.length > 0),
    [role],
  );

  const openMore = (item) => {
    setNotice({
      title: item.label,
      pc: PC_ONLY.has(item.id),
    });
  };

  const title = notice?.title
    || (tab === 'home' ? '홈' : tab === 'reports' ? '신고' : tab === 'inquiries' ? '문의' : tab === 'verify' ? '인증' : '더보기');

  return (
    <div className="admin-mobile-root">
      <header className="m-top">
        {notice ? (
          <button type="button" className="m-back" onClick={() => setNotice(null)}>뒤로</button>
        ) : <span className="m-brand">YP</span>}
        <strong>{title}</strong>
        <span className="m-session">{sessionLabel || '세션'}</span>
      </header>
      <main className="m-body">
        {notice ? (
          <p className="m-empty">
            {notice.pc ? '이 화면은 PC에서 확인해주세요.' : '이 화면은 다음 단계에서 연결합니다.'}
          </p>
        ) : null}
        {!notice && tab === 'home' ? <HomeScreen onOpenReports={() => setTab('reports')} /> : null}
        {!notice && tab === 'reports' ? <ReportsScreen /> : null}
        {!notice && tab === 'inquiries' ? <p className="m-empty">문의 목록은 다음 단계에서 연결합니다.</p> : null}
        {!notice && tab === 'verify' ? <p className="m-empty">인증 목록은 다음 단계에서 연결합니다.</p> : null}
        {!notice && tab === 'more' ? (
          <div className="m-more">
            {moreGroups.map((group) => (
              <section key={group.id}>
                <h2>{group.label}</h2>
                {group.items.map((item) => (
                  <button key={item.id} type="button" onClick={() => openMore(item)}>
                    {item.label}
                    {PC_ONLY.has(item.id) ? <small>PC</small> : null}
                  </button>
                ))}
              </section>
            ))}
            <section>
              <h2>{name || '관리자'}</h2>
              <button type="button" onClick={onExtend}>세션 연장</button>
              <button type="button" onClick={onLogout}>로그아웃</button>
            </section>
          </div>
        ) : null}
      </main>
      <nav className="m-tabs">
        {TABS.filter((item) => {
          if (item.id === 'reports') return canAccess(role, 'reports');
          if (item.id === 'inquiries') return canAccess(role, 'inquiries');
          if (item.id === 'verify') return canAccess(role, 'studentIds') || canAccess(role, 'certificates');
          return true;
        }).map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id && !notice ? 'is-active' : ''}
            onClick={() => {
              setNotice(null);
              setTab(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
