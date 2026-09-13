let tipItems = [];
let tipSelectedId = null;
let tipFilter = 'all';
let tipDraft = {
  body: '',
  status: 'draft',
  isPinned: false,
};

function tipStatusPill(status) {
  if (status === 'active') return 'pill pill-ok';
  return 'pill pill-white';
}

function tipStatusLabel(status) {
  return status === 'active' ? '활성' : '초안';
}

function formatTipDate(iso) {
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

async function loadTipsPanel() {
  const host = document.getElementById('tips-host');
  if (!host) return;
  host.innerHTML = '<div class="txt-muted">불러오는 중…</div>';
  try {
    const qs =
      tipFilter === 'all'
        ? 'limit=100'
        : `limit=100&status=${encodeURIComponent(tipFilter)}`;
    const { data } = await api(`/tips?${qs}`);
    tipItems = data.items || [];
    if (tipSelectedId && !tipItems.some((item) => item.id === tipSelectedId)) {
      tipSelectedId = null;
      tipDraft = { body: '', status: 'draft', isPinned: false };
    }
    if (tipSelectedId) {
      const selected = tipItems.find((item) => item.id === tipSelectedId);
      if (selected) {
        tipDraft = {
          body: selected.body || '',
          status: selected.status || 'draft',
          isPinned: Boolean(selected.isPinned),
        };
      }
    }
    renderTipsPanel();
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">불러오지 못했습니다: ${esc(error.message)}</div>`;
  }
}

function tipNewDraft() {
  tipSelectedId = null;
  tipDraft = { body: '', status: 'draft', isPinned: false };
  renderTipsPanel();
}

async function tipSelect(id) {
  const itemId = Number(id);
  const item = tipItems.find((row) => row.id === itemId);
  if (!item) return;
  tipSelectedId = itemId;
  tipDraft = {
    body: item.body || '',
    status: item.status || 'draft',
    isPinned: Boolean(item.isPinned),
  };
  renderTipsPanel();
}

function tipSetFilter(filter) {
  tipFilter = filter;
  loadTipsPanel();
}

function renderTipsPanel() {
  const host = document.getElementById('tips-host');
  if (!host) return;

  const filterBtns = [
    ['all', '전체'],
    ['active', '활성'],
    ['draft', '초안'],
  ]
    .map(([key, label]) => {
      const active = tipFilter === key ? 'active' : '';
      return `<button type="button" class="btn btn-sm ${active}" onclick="tipSetFilter('${key}')">${label}</button>`;
    })
    .join('');

  const listHtml = tipItems
    .map((item) => {
      const active =
        tipSelectedId === item.id ? 'whack-list-item active' : 'whack-list-item';
      const pin = item.isPinned
        ? '<span class="pill pill-ok" style="font-size:10px">고정</span>'
        : '';
      return `
      <button type="button" class="${active}" onclick="tipSelect(${item.id})">
        <div class="whack-list-top">
          <strong>#${item.id}</strong>
          <span class="${tipStatusPill(item.status)}" style="font-size:10px">${tipStatusLabel(item.status)}</span>
          ${pin}
        </div>
        <div class="whack-list-content">${esc(item.body)}</div>
        <div class="whack-list-meta">${esc(formatTipDate(item.updatedAt || item.createdAt))}</div>
      </button>`;
    })
    .join('');

  const editingLabel = tipSelectedId ? `수정 #${tipSelectedId}` : '새 팁 작성';
  const pinChecked = tipDraft.isPinned ? 'checked' : '';
  const pinDisabled = tipDraft.status !== 'active' ? 'disabled' : '';

  host.innerHTML = `
    <div class="filter-row" style="margin-bottom:12px; gap:8px; display:flex; flex-wrap:wrap; align-items:center">
      ${filterBtns}
      <button type="button" class="btn btn-sm" onclick="tipNewDraft()">+ 새 팁</button>
    </div>
    <div style="display:grid; grid-template-columns: minmax(220px, 280px) 1fr; gap:16px; align-items:start">
      <div class="whack-list" style="max-height:70vh; overflow:auto">
        ${listHtml || '<div class="txt-muted" style="padding:12px">팁이 없습니다.</div>'}
      </div>
      <div class="whack-detail-card">
        <div class="whack-detail-title">${esc(editingLabel)}</div>
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:10px">
          <label>
            <div class="txt-muted" style="margin-bottom:4px">문구</div>
            <textarea id="tip-body" class="input" style="width:100%; min-height:120px; resize:vertical"
              maxlength="500"
              oninput="tipDraft.body=this.value">${esc(tipDraft.body)}</textarea>
          </label>
          <label>
            <div class="txt-muted" style="margin-bottom:4px">상태</div>
            <select id="tip-status" class="input" style="width:160px"
              onchange="tipDraft.status=this.value; tipDraft.isPinned = this.value === 'active' ? tipDraft.isPinned : false; renderTipsPanel()">
              <option value="draft" ${tipDraft.status === 'draft' ? 'selected' : ''}>초안</option>
              <option value="active" ${tipDraft.status === 'active' ? 'selected' : ''}>활성</option>
            </select>
          </label>
          <label style="display:flex; align-items:center; gap:8px">
            <input type="checkbox" id="tip-pinned" ${pinChecked} ${pinDisabled}
              onchange="tipDraft.isPinned=this.checked" />
            <span>게시판 상단 고정 (활성 팁 중 1개만)</span>
          </label>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px">
            <button type="button" class="btn" onclick="tipSave()">저장</button>
            ${
              tipSelectedId
                ? '<button type="button" class="btn btn-danger" onclick="tipDelete()">삭제</button>'
                : ''
            }
          </div>
          <p class="txt-muted" style="margin:0; font-size:12px">
            고정 ON이면 다른 고정은 자동 해제됩니다. 광고가 없을 때 메인 게시판 상단 팁에 노출됩니다.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function tipSave() {
  const body = String(tipDraft.body || '').trim();
  const status = tipDraft.status === 'active' ? 'active' : 'draft';
  const isPinned = status === 'active' && Boolean(tipDraft.isPinned);
  if (!body) {
    alert('팁 문구를 입력해 주세요.');
    return;
  }
  try {
    const payload = { body, status, isPinned };
    if (tipSelectedId) {
      const { data } = await api(`/tips/${tipSelectedId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      tipSelectedId = data.id;
    } else {
      const { data } = await api('/tips', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      tipSelectedId = data.id;
    }
    await loadTipsPanel();
  } catch (error) {
    alert(error.message || '저장에 실패했습니다.');
  }
}

async function tipDelete() {
  if (!tipSelectedId) return;
  if (!confirm(`팁 #${tipSelectedId}를 삭제할까요?`)) return;
  try {
    await api(`/tips/${tipSelectedId}`, { method: 'DELETE' });
    tipSelectedId = null;
    tipDraft = { body: '', status: 'draft', isPinned: false };
    await loadTipsPanel();
  } catch (error) {
    alert(error.message || '삭제에 실패했습니다.');
  }
}

async function loadTips() {
  return loadTipsPanel();
}
