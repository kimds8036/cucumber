import { useEffect, useMemo, useState } from 'react';
import { NAV_GROUPS, canAccess, visibleItems } from '../nav.js';
import UserLookup from '../components/UserLookup.jsx';
import HomeScreen from './HomeScreen.jsx';
import ReportsScreen from './ReportsScreen.jsx';
import InquiriesScreen from './InquiriesScreen.jsx';
import MonitorHub from './MonitorHub.jsx';
import CronScreen from './CronScreen.jsx';
import MonitorStatus from './MonitorStatus.jsx';
import VerifyScreen from './VerifyScreen.jsx';
import AttendanceScreen from './AttendanceScreen.jsx';
import AnnouncementsScreen from './AnnouncementsScreen.jsx';
import DailyPushScreen from './DailyPushScreen.jsx';
import OpsScreen from './OpsScreen.jsx';
import { TipsScreen, HashtagsScreen, WhackScreen, LogsScreen, EmergencyScreen } from './MoreEditors.jsx';

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
  'timerBots',
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

const LIVE_SCREENS = {
  'ops-user-lookup': 'lookup',
  attendance: 'attendance',
  announcements: 'announcements',
  dailyPush: 'dailyPush',
  tips: 'tips',
  recommendedHashtags: 'hashtags',
  hallOfFame: 'whack',
  logs: 'logs',
  emergency: 'emergency',
};

function readSavedNav() {
  try {
    return JSON.parse(sessionStorage.getItem('admin-mobile-nav') || 'null');
  } catch {
    return null;
  }
}

function tabCount(id, badges) {
  if (id === 'reports') return Number(badges.reports) || 0;
  if (id === 'inquiries') return Number(badges.inquiries) || 0;
  if (id === 'verify') {
    return (Number(badges.studentIds) || 0)
      + (Number(badges.certificates) || 0)
      + (Number(badges.reverificationIds) || 0);
  }
  return 0;
}

export default function MobileShell({ role, name, sessionLabel, badges = {}, health = {}, onLogout, onExtend }) {
  const saved = readSavedNav();
  const [tab, setTab] = useState(saved?.tab || 'home');
  const [notice, setNotice] = useState(null);
  const [monitor, setMonitor] = useState(saved?.monitor || null);
  const [extra, setExtra] = useState(saved?.extra || null);

  const moreGroups = useMemo(
    () => NAV_GROUPS.map((group) => ({
      ...group,
      items: visibleItems(group, role).filter((item) => !IN_TABS.has(item.id) && group.id !== 'ops'),
    })).filter((group) => group.items.length > 0),
    [role],
  );

  useEffect(() => {
    const payload = { tab, monitor, extra };
    sessionStorage.setItem('admin-mobile-nav', JSON.stringify(payload));
    window.__adminMobileNav = payload;
  }, [tab, monitor, extra]);

  const openMore = (item) => {
    if (LIVE_SCREENS[item.id]) {
      setNotice(null);
      setExtra({ id: LIVE_SCREENS[item.id], title: item.label });
      return;
    }
    setExtra(null);
    setNotice({
      title: item.label,
      pc: PC_ONLY.has(item.id),
    });
  };

  const goBack = () => {
    if (extra) {
      setExtra(null);
      return;
    }
    if (monitor && monitor.view !== 'hub') {
      setMonitor({ view: 'hub', title: '모니터링' });
      return;
    }
    setMonitor(null);
    setNotice(null);
  };

  const title = extra?.title
    || notice?.title
    || monitor?.title
    || (tab === 'home' ? '홈' : tab === 'reports' ? '신고' : tab === 'inquiries' ? '문의' : tab === 'verify' ? '인증' : '더보기');

  return (
    <div className="admin-mobile-root">
      <header className="m-top">
        {notice || monitor || extra ? (
          <button type="button" className="m-back" onClick={goBack}>뒤로</button>
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
        {!notice && monitor?.view === 'hub' ? (
          <MonitorHub
            role={role}
            health={health}
            onOpen={(view, item) => setMonitor({
              view,
              title: view === 'jobs' ? '크론' : (item.label || '모니터링'),
              state: item.state || 'unknown',
              label: item.label,
            })}
          />
        ) : null}
        {!notice && monitor?.view === 'jobs' ? <CronScreen /> : null}
        {!notice && monitor && ['user', 'timer', 'study-rooms', 'activity', 'terms', 'map', 'reach', 'funnel'].includes(monitor.view) ? (
          <OpsScreen key={monitor.view} view={monitor.view} />
        ) : null}
        {!notice && monitor?.view === 'status' ? (
          <MonitorStatus label={monitor.label} state={monitor.state} />
        ) : null}
        {!notice && monitor?.view === 'soon' ? (
          <p className="m-empty">이 화면은 다음 단계에서 연결합니다.</p>
        ) : null}
        {!notice && !monitor && extra?.id === 'lookup' ? <UserLookup mode="mobile" /> : null}
        {!notice && !monitor && extra?.id === 'attendance' ? <AttendanceScreen /> : null}
        {!notice && !monitor && extra?.id === 'announcements' ? <AnnouncementsScreen /> : null}
        {!notice && !monitor && extra?.id === 'dailyPush' ? <DailyPushScreen /> : null}
        {!notice && !monitor && extra?.id === 'tips' ? <TipsScreen /> : null}
        {!notice && !monitor && extra?.id === 'hashtags' ? <HashtagsScreen /> : null}
        {!notice && !monitor && extra?.id === 'whack' ? <WhackScreen /> : null}
        {!notice && !monitor && extra?.id === 'logs' ? <LogsScreen /> : null}
        {!notice && !monitor && extra?.id === 'emergency' ? <EmergencyScreen role={role} /> : null}
        {!notice && tab === 'home' ? <HomeScreen onOpenReports={() => setTab('reports')} /> : null}
        {!notice && tab === 'reports' ? <ReportsScreen role={role} /> : null}
        {!notice && tab === 'inquiries' ? <InquiriesScreen /> : null}
        {!notice && tab === 'verify' ? <VerifyScreen role={role} /> : null}
        {!notice && !monitor && !extra && tab === 'more' ? (
          <div className="m-more">
            {canAccess(role, 'ops') ? (
              <section>
                <h2>모니터링</h2>
                <button type="button" onClick={() => setMonitor({ view: 'hub', title: '모니터링' })}>
                  모니터링
                </button>
              </section>
            ) : null}
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
            className={tab === item.id && !notice && !monitor && !extra ? 'is-active' : ''}
            onClick={() => {
              setNotice(null);
              setMonitor(null);
              setExtra(null);
              setTab(item.id);
            }}
          >
            <span>{item.label}</span>
            {tabCount(item.id, badges) > 0 ? (
              <em className="m-tab-badge">{tabCount(item.id, badges)}</em>
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
