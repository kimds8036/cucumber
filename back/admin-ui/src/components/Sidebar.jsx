import {
  Activity,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldAlert,
  Siren,
  UserPlus,
} from 'lucide-react';
import { visibleItems } from '../nav.js';

const ICONS = {
  LayoutDashboard,
  ShieldAlert,
  MessagesSquare,
  UserPlus,
  Activity,
  GraduationCap,
  Siren,
  ScrollText,
  Settings,
};

function badgeTotal(items, badges) {
  return items.reduce((sum, item) => sum + (item.badge ? Number(badges[item.badge] || 0) : 0), 0);
}

export default function Sidebar({ groups, role, activeGroupId, badges, collapsed, onSelect }) {
  return (
    <aside className={`console-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="console-logo">
        <span className="console-logo-mark">YP</span>
        {collapsed ? null : <span>YouthPaper</span>}
      </div>
      <nav className="console-nav">
        {groups.map((group) => {
          const items = visibleItems(group, role);
          if (!items.length) return null;
          const Icon = ICONS[group.icon];
          const count = badgeTotal(items, badges);
          const active = group.id === activeGroupId;
          return (
            <button
              key={group.id}
              type="button"
              className={`console-nav-item ${active ? 'is-active' : ''}`}
              title={group.label}
              onClick={() => onSelect(items[0])}
            >
              {Icon ? <Icon size={16} strokeWidth={1.75} /> : null}
              {collapsed ? null : <span className="console-nav-label">{group.label}</span>}
              {!collapsed && count > 0 ? <span className="console-badge">{count}</span> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
