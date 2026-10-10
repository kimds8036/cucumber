import { useEffect, useState } from 'react';
import DataTable from './DataTable.jsx';
import Tag from './Tag.jsx';

async function searchAll(query) {
  const q = query.trim();
  if (!q || typeof window.api !== 'function') return [];
  const rows = [];
  const [users, inquiries, reports] = await Promise.allSettled([
    window.api(`/users?q=${encodeURIComponent(q)}`),
    window.api(`/inquiries?view=pending&limit=20&q=${encodeURIComponent(q)}`),
    window.api(`/reports?view=pending&limit=40`),
  ]);
  if (users.status === 'fulfilled') {
    (users.value.data?.users || []).slice(0, 8).forEach((user) => {
      rows.push({
        id: `user-${user.id}`,
        kind: '사용자',
        title: user.username || user.name || `#${user.id}`,
        meta: user.school_name || `UID ${user.id}`,
        page: 'users',
      });
    });
  }
  if (inquiries.status === 'fulfilled') {
    (inquiries.value.data?.inquiries || []).slice(0, 8).forEach((item) => {
      rows.push({
        id: `inquiry-${item.id}`,
        kind: '문의',
        title: String(item.content || item.body || `문의 #${item.id}`).slice(0, 80),
        meta: item.username || item.contact || `#${item.id}`,
        page: 'inquiries',
      });
    });
  }
  if (reports.status === 'fulfilled') {
    const needle = q.toLowerCase();
    (reports.value.data?.reports || [])
      .filter((report) => {
        const blob = `${report.id} ${report.target_content || ''} ${report.description || ''} ${report.reporter_id || ''}`.toLowerCase();
        return blob.includes(needle);
      })
      .slice(0, 8)
      .forEach((report) => {
        rows.push({
          id: `report-${report.id}`,
          kind: '신고',
          title: String(report.target_content || report.description || `신고 #${report.id}`).slice(0, 80),
          meta: `#${report.id}`,
          page: 'reports',
        });
      });
  }
  return rows;
}

export default function CommandPalette({ open, onClose, onOpen }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setRows([]);
        return;
      }
      setBusy(true);
      searchAll(query)
        .then(setRows)
        .catch(() => setRows([]))
        .finally(() => setBusy(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;
  return (
    <div className="console-palette-backdrop" onClick={onClose}>
      <div className="console-palette" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          className="console-palette-input"
          placeholder="사용자, 신고, 문의 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <DataTable
          empty={busy ? '검색 중' : '검색어를 입력하세요'}
          columns={[
            {
              key: 'kind',
              label: '종류',
              render: (row) => <Tag>{row.kind}</Tag>,
            },
            { key: 'title', label: '내용' },
            { key: 'meta', label: '대상' },
          ]}
          rows={rows}
          onRow={(row) => {
            onOpen(row.page);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
