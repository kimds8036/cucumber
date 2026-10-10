import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CommandPalette from './components/CommandPalette.jsx';
import Sidebar from './components/Sidebar.jsx';
import StatusPill from './components/StatusPill.jsx';
import Topbar from './components/Topbar.jsx';
import { NAV_GROUPS, findItem, visibleItems } from './nav.js';

function readSession() {
  const el = document.getElementById('session-countdown');
  return el?.textContent || '';
}

export default function App() {
  const [role, setRole] = useState(window.__ADMIN_ROLE__ || 'moderator');
  const [name, setName] = useState('');
  const [page, setPage] = useState('dashboard');
  const [opsView, setOpsView] = useState(null);
  const [itemId, setItemId] = useState('dashboard');
  const [badges, setBadges] = useState({});
  const [health, setHealth] = useState({ api: 'unknown', db: 'unknown', socket: 'unknown', cron: 'unknown', push: 'unknown' });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [palette, setPalette] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('');
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 960px)').matches);

  useEffect(() => {
    const onPage = (event) => {
      setPage(event.detail?.page || 'dashboard');
      setOpsView(event.detail?.opsView || null);
      setItemId(event.detail?.itemId || '');
    };
    const onBadge = (event) => {
      const { key, count } = event.detail || {};
      if (!key) return;
      setBadges((prev) => ({ ...prev, [key]: count }));
    };
    const onProfile = (event) => {
      setRole(event.detail?.role || window.__ADMIN_ROLE__ || 'moderator');
      setName(event.detail?.name || event.detail?.username || '');
    };
    const onHealth = (event) => {
      setHealth((prev) => ({ ...prev, ...(event.detail || {}) }));
      setUpdatedAt(new Date());
    };
    setRole(window.__ADMIN_ROLE__ || 'moderator');
    setName(window.__ADMIN_PROFILE_NAME__ || '');
    setBadges({ ...(window.__adminBadges || {}) });
    window.addEventListener('admin:page', onPage);
    window.addEventListener('admin:badge', onBadge);
    window.addEventListener('admin:profile', onProfile);
    window.addEventListener('admin:health', onHealth);
    const sessionTimer = setInterval(() => setSessionLabel(readSession()), 1000);
    const media = window.matchMedia('(max-width: 960px)');
    const onMedia = () => setCollapsed(media.matches);
    media.addEventListener('change', onMedia);
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette(true);
      }
      if (event.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('admin:page', onPage);
      window.removeEventListener('admin:badge', onBadge);
      window.removeEventListener('admin:profile', onProfile);
      window.removeEventListener('admin:health', onHealth);
      window.removeEventListener('keydown', onKey);
      media.removeEventListener('change', onMedia);
      clearInterval(sessionTimer);
    };
  }, []);

  useEffect(() => {
    document.querySelector('.layout')?.classList.toggle('sidebar-collapsed', collapsed);
  }, [collapsed]);

  const located = itemId
    ? (NAV_GROUPS.map((group) => {
        const item = group.items.find((entry) => entry.id === itemId);
        return item ? { group, item } : null;
      }).find(Boolean) || findItem(page, opsView))
    : findItem(page, opsView);
  const subtabs = visibleItems(located.group, role);
  const crumbs = [located.group.label, located.item.label].filter((value, index, list) => list.indexOf(value) === index);

  const openItem = (item) => {
    window.__adminNavItem = item.id || '';
    window.__adminOpsView = item.opsView || null;
    window.go?.(item.panel, item.opsView || null);
  };

  const envLabel = window.__ADMIN_DEPLOY_ENV__ === 'production' ? 'PROD' : 'DEVELOP';
  const stamp = useMemo(() => {
    if (!updatedAt) return '갱신 대기';
    return `마지막 갱신 ${updatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }, [updatedAt]);

  const sidebarHost = document.getElementById('admin-sidebar-root');
  const chromeHost = document.getElementById('admin-chrome-root');
  if (!sidebarHost || !chromeHost) return null;

  return (
    <>
      {createPortal(
        <Sidebar
          groups={NAV_GROUPS}
          role={role}
          activeGroupId={located.group.id}
          badges={badges}
          collapsed={collapsed}
          onSelect={openItem}
        />,
        sidebarHost,
      )}
      {createPortal(
        <div className="console-main-chrome">
        <Topbar
          crumbs={crumbs}
          role={role}
          name={name}
          envLabel={envLabel}
          sessionLabel={sessionLabel ? `세션 ${sessionLabel}` : '세션'}
          onSearch={() => setPalette(true)}
        />
        {subtabs.length > 1 ? (
          <div className="console-subtabs">
            {subtabs.map((item) => {
              const active = item.id === located.item.id;
              const count = item.badge ? Number(badges[item.badge] || 0) : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`console-subtab ${active ? 'is-active' : ''}`}
                  onClick={() => openItem(item)}
                >
                  {item.label}
                  {count > 0 ? <span className="console-badge">{count}</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="console-status-row">
          <StatusPill label="API" state={health.api} />
          <StatusPill label="DB" state={health.db} />
          <StatusPill label="소켓" state={health.socket} />
          <StatusPill label="크론" state={health.cron} />
          <StatusPill label="푸시" state={health.push} />
          <span className="console-updated">{stamp}</span>
        </div>
        </div>,
        chromeHost,
      )}
      {createPortal(
        <CommandPalette open={palette} onClose={() => setPalette(false)} onOpen={(next) => openItem({ panel: next })} />,
        document.body,
      )}
    </>
  );
}
