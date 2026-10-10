import { Search } from 'lucide-react';
import { ROLE_LABELS } from '../nav.js';

export default function Topbar({ crumbs, role, name, envLabel, sessionLabel, onSearch }) {
  const env = String(envLabel || 'DEVELOP').toUpperCase();
  const prod = env.startsWith('PROD');
  return (
    <header className="console-topbar">
      <div className="console-crumbs">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`}>
            {index > 0 ? <span className="console-crumb-sep">/</span> : null}
            <span className={index === crumbs.length - 1 ? 'is-current' : ''}>{crumb}</span>
          </span>
        ))}
      </div>
      <button type="button" className="console-search" onClick={onSearch}>
        <Search size={14} strokeWidth={1.75} />
        <span>사용자, 신고, 문의 검색</span>
        <kbd>Ctrl+K</kbd>
      </button>
      <div className="console-topbar-meta">
        <span className={`console-env ${prod ? 'is-prod' : ''}`}>{prod ? 'PROD' : env}</span>
        <span className="console-session">{sessionLabel}</span>
        <button type="button" className="console-text-btn" onClick={() => window.extendAdminSession?.()}>
          연장
        </button>
        <div className="console-profile">
          <span className="console-avatar">{(name || role || 'A').slice(0, 1)}</span>
          <span>
            <strong>{name || '관리자'}</strong>
            <small>{ROLE_LABELS[role] || role || '역할'}</small>
          </span>
        </div>
        <button type="button" className="console-text-btn" onClick={() => window.adminLogout?.()}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
