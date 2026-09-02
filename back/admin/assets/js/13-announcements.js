let announcementItems = [];
let announcementSelectedId = null;
let announcementFilter = 'all';
let announcementDraft = {
  title: '',
  content: '',
  status: 'draft',
};

function announcementStatusPill(status) {
  if (status === 'published') return 'pill pill-ok';
  return 'pill pill-white';
}

function announcementStatusLabel(status) {
  return status === 'published' ? '게시' : '초안';
}

function formatAnnouncementDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
      .format(new Date(iso))
      .slice(0, 16)
      .replace('T', ' ');
  } catch {
    return String(iso).slice(0, 16);
  }
}

async function loadAnnouncementsPanel() {
  const host = document.getElementById('announcements-host');
  if (!host) return;
  host.innerHTML = '<div class="txt-muted">불러오는 중…</div>';
  try {
    const qs =
      announcementFilter === 'all'
        ? 'limit=100'
        : `limit=100&status=${encodeURIComponent(announcementFilter)}`;
    const { data } = await api(`/announcements?${qs}`);
    announcementItems = data.items || [];
    if (
      announcementSelectedId &&
      !announcementItems.some((item) => item.id === announcementSelectedId)
    ) {
      announcementSelectedId = null;
      announcementDraft = { title: '', content: '', status: 'draft' };
    }
    if (announcementSelectedId) {
      const selected = announcementItems.find((item) => item.id === announcementSelectedId);
      if (selected) {
        announcementDraft = {
          title: selected.title || '',
          content: selected.content || '',
          status: selected.status || 'draft',
        };
      }
    }
    renderAnnouncementsPanel();
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">불러오지 못했습니다: ${esc(error.message)}</div>`;
  }
}

function announcementNewDraft() {
  announcementSelectedId = null;
  announcementDraft = { title: '', content: '', status: 'draft' };
  renderAnnouncementsPanel();
}

async function announcementSelect(id) {
  const itemId = Number(id);
  const item = announcementItems.find((row) => row.id === itemId);
  if (!item) return;
  announcementSelectedId = itemId;
  announcementDraft = {
    title: item.title || '',
    content: item.content || '',
    status: item.status || 'draft',
  };
  renderAnnouncementsPanel();
}

function announcementSetFilter(filter) {
  announcementFilter = filter;
  loadAnnouncementsPanel();
}

function renderAnnouncementsPanel() {
  const host = document.getElementById('announcements-host');
  if (!host) return;

  const filterBtns = [
    ['all', '전체'],
    ['published', '게시'],
    ['draft', '초안'],
  ]
    .map(([key, label]) => {
      const active = announcementFilter === key ? 'active' : '';
      return `<button type="button" class="btn btn-sm ${active}" onclick="announcementSetFilter('${key}')">${label}</button>`;
    })
    .join('');

  const listHtml = announcementItems
    .map((item) => {
      const active =
        announcementSelectedId === item.id
          ? 'whack-list-item active'
          : 'whack-list-item';
      const dateLabel = formatAnnouncementDate(item.publishedAt || item.createdAt);
      return `
      <button type="button" class="${active}" onclick="announcementSelect(${item.id})">
        <div class="whack-list-top">
          <strong>#${item.id}</strong>
          <span class="${announcementStatusPill(item.status)}" style="font-size:10px">${announcementStatusLabel(item.status)}</span>
        </div>
        <div class="whack-list-content">${esc(item.title)}</div>
        <div class="whack-list-meta">${esc(dateLabel)}</div>
      </button>`;
    })
    .join('');

  const editingLabel = announcementSelectedId
    ? `수정 #${announcementSelectedId}`
    : '새 공지 작성';

  host.innerHTML = `
    <div class="filter-row" style="margin-bottom:12px; gap:8px; display:flex; flex-wrap:wrap; align-items:center">
      ${filterBtns}
      <button type="button" class="btn btn-sm" onclick="announcementNewDraft()">+ 새 공지</button>
    </div>
    <div style="display:grid; grid-template-columns: minmax(220px, 280px) 1fr; gap:16px; align-items:start">
      <div class="whack-list" style="max-height:70vh; overflow:auto">
        ${listHtml || '<div class="txt-muted" style="padding:12px">공지사항이 없습니다.</div>'}
      </div>
      <div class="whack-detail-card">
        <div class="whack-detail-title">${esc(editingLabel)}</div>
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:10px">
          <label>
            <div class="txt-muted" style="margin-bottom:4px">제목</div>
            <input id="announcement-title" class="input" style="width:100%" maxlength="200"
              value="${esc(announcementDraft.title)}"
              oninput="announcementDraft.title=this.value" />
          </label>
          <label>
            <div class="txt-muted" style="margin-bottom:4px">내용</div>
            <textarea id="announcement-content" class="input" style="width:100%; min-height:220px; resize:vertical"
              oninput="announcementDraft.content=this.value">${esc(announcementDraft.content)}</textarea>
          </label>
          <label>
            <div class="txt-muted" style="margin-bottom:4px">상태</div>
            <select id="announcement-status" class="input" style="width:160px"
              onchange="announcementDraft.status=this.value">
              <option value="draft" ${announcementDraft.status === 'draft' ? 'selected' : ''}>초안</option>
              <option value="published" ${announcementDraft.status === 'published' ? 'selected' : ''}>게시</option>
            </select>
          </label>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px">
            <button type="button" class="btn" onclick="announcementSave()">저장</button>
            ${
              announcementSelectedId
                ? '<button type="button" class="btn btn-danger" onclick="announcementDelete()">삭제</button>'
                : ''
            }
          </div>
          <p class="txt-muted" style="margin:0; font-size:12px">
            게시를 선택하고 저장하면 앱 고객지원 &gt; 공지사항에 노출됩니다. 날짜는 게시 시각 기준입니다.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function announcementSave() {
  const title = String(announcementDraft.title || '').trim();
  const content = String(announcementDraft.content || '').trim();
  const status = announcementDraft.status === 'published' ? 'published' : 'draft';
  if (!title || !content) {
    alert('제목과 내용을 입력해 주세요.');
    return;
  }
  try {
    const body = { title, content, status };
    if (announcementSelectedId) {
      const { data } = await api(`/announcements/${announcementSelectedId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      announcementSelectedId = data.id;
    } else {
      const { data } = await api('/announcements', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      announcementSelectedId = data.id;
    }
    await loadAnnouncementsPanel();
  } catch (error) {
    alert(error.message || '저장에 실패했습니다.');
  }
}

async function announcementDelete() {
  if (!announcementSelectedId) return;
  if (!confirm(`공지 #${announcementSelectedId}를 삭제할까요?`)) return;
  try {
    await api(`/announcements/${announcementSelectedId}`, { method: 'DELETE' });
    announcementSelectedId = null;
    announcementDraft = { title: '', content: '', status: 'draft' };
    await loadAnnouncementsPanel();
  } catch (error) {
    alert(error.message || '삭제에 실패했습니다.');
  }
}

async function loadAnnouncements() {
  return loadAnnouncementsPanel();
}
