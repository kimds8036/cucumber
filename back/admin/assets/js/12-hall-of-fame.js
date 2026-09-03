let whackSelectedGroupId = null;
let whackGroups = [];
let whackGroupDetail = null;
let whackFeedbackItems = [];
let whackSelectedFeedback = new Set();
let whackQuery = '';
let whackResponseDraft = { adminResponseStatus: 'none', adminResponse: '' };

function whackCategoryLabel(category) {
  if (category === 'bug') return '버그';
  if (category === 'feature') return '기능';
  return '기타';
}

function whackStatusLabel(status) {
  if (status === 'fixed') return '반영 완료';
  if (status === 'planned') return '도입 예정';
  if (status === 'declined') return '도입 불가';
  return '검토 중';
}

function whackStatusPill(status) {
  if (status === 'fixed') return 'pill pill-ok';
  if (status === 'planned') return 'pill pill-white';
  if (status === 'declined') return 'pill';
  return 'pill pill-danger';
}

async function loadHallOfFamePanel() {
  const host = document.getElementById('hall-of-fame-host');
  if (!host) return;
  host.innerHTML = '<div class="txt-muted">불러오는 중…</div>';
  try {
    const q = encodeURIComponent(whackQuery || '');
    const [{ data: groupData }, { data: feedbackData }] = await Promise.all([
      api(`/hall-of-fame/developer-feedback/groups?limit=100&q=${q}`),
      api(`/hall-of-fame/developer-feedback?limit=120&q=${q}`),
    ]);
    whackGroups = groupData.items || [];
    whackFeedbackItems = feedbackData.items || [];
    if (whackSelectedGroupId && whackGroups.some((g) => g.id === whackSelectedGroupId)) {
      await whackSelectGroup(whackSelectedGroupId, { rerender: false });
    } else if (whackGroups.length) {
      await whackSelectGroup(whackGroups[0].id, { rerender: false });
    } else {
      whackSelectedGroupId = null;
      whackGroupDetail = null;
    }
    renderWhackPanel();
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">불러오지 못했습니다: ${esc(error.message)}</div>`;
  }
}

async function whackSelectGroup(groupId, { rerender = true } = {}) {
  const gid = Number(groupId);
  if (!Number.isFinite(gid) || gid < 1) return;
  try {
    const { data } = await api(`/hall-of-fame/developer-feedback/groups/${gid}`);
    whackSelectedGroupId = gid;
    whackGroupDetail = data;
    whackResponseDraft = {
      adminResponseStatus: data.adminResponseStatus || 'none',
      adminResponse: data.adminResponse || '',
    };
    if (rerender) renderWhackPanel();
  } catch (error) {
    alert(error.message);
  }
}

function renderWhackPanel() {
  const host = document.getElementById('hall-of-fame-host');
  if (!host) return;

  const groupListHtml = whackGroups.map((g) => {
    const active = whackSelectedGroupId === g.id ? 'whack-list-item active' : 'whack-list-item';
    const status = g.adminResponseStatus && g.adminResponseStatus !== 'none'
      ? `<span class="${whackStatusPill(g.adminResponseStatus)}" style="font-size:10px">${whackStatusLabel(g.adminResponseStatus)}</span>`
      : '<span class="pill pill-danger" style="font-size:10px">검토 중</span>';
    return `
      <button type="button" class="${active}" onclick="whackSelectGroup(${g.id})">
        <div class="whack-list-top">
          <strong>G#${g.id}</strong>
          <span class="pill pill-white" style="font-size:10px">${whackCategoryLabel(g.category)}</span>
          ${status}
        </div>
        <div class="whack-list-content">${esc(g.content)}</div>
        <div class="whack-list-meta">${esc(g.honoreeDisplay || '익명')} · ${g.reporterCount || 1}명</div>
      </button>
    `;
  }).join('');

  const detail = whackGroupDetail;
  const memberRows = (detail?.members || []).map((m) => {
    const who = m.username ? `@${esc(m.username)} · ${esc(m.maskedName)}` : '비로그인';
    const primary = m.isPrimary ? '<span class="pill pill-ok" style="font-size:10px">최초</span>' : '';
    const school = m.schoolPublic
      ? '<span class="pill pill-white" style="font-size:10px">학교 공개</span>'
      : '';
    return `
      <tr>
        <td>#${m.id} ${primary}</td>
        <td>${esc(m.honoreeName || m.maskedName || '—')}</td>
        <td>${who} ${school}</td>
        <td class="txt-muted">${esc(String(m.content || '').slice(0, 40))}</td>
      </tr>
    `;
  }).join('');

  const mergeRows = whackFeedbackItems.map((fb) => {
    const checked = whackSelectedFeedback.has(String(fb.id)) ? 'checked' : '';
    const inSelected = detail && fb.groupId === detail.id;
    return `
      <label class="whack-merge-row${inSelected ? ' whack-merge-row-in-group' : ''}">
        <input type="checkbox" ${checked} onchange="whackToggleFeedback(${fb.id}, this.checked)" />
        <span><strong>#${fb.id}</strong> G#${fb.groupId} · ${esc(fb.honoreeName || fb.maskedName || '익명')}</span>
        <span class="txt-muted">${esc(String(fb.content || '').slice(0, 48))}</span>
      </label>
    `;
  }).join('');

  const detailHtml = detail ? `
    <div class="whack-detail-card">
      <div class="whack-detail-head">
        <div>
          <div class="whack-detail-title">G#${detail.id} · ${whackCategoryLabel(detail.category)}</div>
          <div class="whack-detail-sub">${esc(detail.honoreeDisplay || '익명')} · ${detail.reporterCount || 1}명 제보</div>
        </div>
      </div>
      <div class="whack-detail-content">${esc(detail.content)}</div>

      <div class="whack-section">
        <div class="section-title">제보자</div>
        <div class="table-wrap whack-table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:88px">제보</th>
                <th style="width:96px">희망명</th>
                <th>계정</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>${memberRows || '<tr><td colspan="4" class="empty-row">제보자가 없습니다.</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="whack-section">
        <div class="section-title">개발팀 답변 (앱에 표시)</div>
        <div class="form-grid form-grid-single">
          <label class="form-field">
            <span class="form-field-label">상태</span>
            <select id="whack-response-status" class="note-input">
              <option value="none" ${whackResponseDraft.adminResponseStatus === 'none' ? 'selected' : ''}>검토 중</option>
              <option value="fixed" ${whackResponseDraft.adminResponseStatus === 'fixed' ? 'selected' : ''}>반영 완료</option>
              <option value="planned" ${whackResponseDraft.adminResponseStatus === 'planned' ? 'selected' : ''}>도입 예정</option>
              <option value="declined" ${whackResponseDraft.adminResponseStatus === 'declined' ? 'selected' : ''}>도입 불가</option>
            </select>
          </label>
          <label class="form-field">
            <span class="form-field-label">답변 내용 (최대 500자)</span>
            <textarea id="whack-response-text" class="note-input" rows="4" placeholder="예: 버그를 수정했어요. / 다음 업데이트에 반영 예정이에요.">${esc(whackResponseDraft.adminResponse)}</textarea>
          </label>
        </div>
        <div class="toolbar" style="margin-top:10px">
          <button type="button" class="btn btn-primary" onclick="whackSaveResponse()">답변 저장</button>
        </div>
      </div>
    </div>
  ` : '<div class="txt-muted" style="padding:24px">왼쪽에서 제보 묶음을 선택하세요.</div>';

  host.innerHTML = `
    <div class="whack-layout">
      <aside class="whack-list-col">
        <div class="whack-panel-card">
          <div class="whack-panel-head">
            <div class="whack-panel-title">제보 묶음</div>
            <button type="button" class="btn btn-sm" onclick="whackReload()">새로고침</button>
          </div>
          <div class="toolbar filter-row" style="margin:0 0 10px">
            <input id="whack-q" class="note-input input-compact" type="text" placeholder="G#번호 · 내용 · 이름" style="flex:1" value="${esc(whackQuery)}" />
            <button type="button" class="btn btn-sm" onclick="whackSearch()">검색</button>
          </div>
          <div class="whack-group-list">${groupListHtml || '<div class="txt-muted" style="padding:12px;font-size:13px">제보가 없습니다.</div>'}</div>
        </div>
      </aside>
      <div class="whack-detail-col">${detailHtml}</div>
    </div>

    <div class="whack-panel-card" style="margin-top:16px">
      <div class="whack-panel-head">
        <div class="whack-panel-title">개별 제보 · 묶기</div>
        <button type="button" class="btn btn-sm btn-primary" onclick="whackMergeSelected()">선택 묶어서 답변</button>
      </div>
      <p class="section-hint" style="margin:0 0 10px">같은 의견 제보를 2건 이상 선택하면 최초 제보 기준으로 하나의 묶음이 됩니다.</p>
      <div class="whack-merge-list">${mergeRows || '<div class="txt-muted" style="padding:12px">제보가 없습니다.</div>'}</div>
    </div>
  `;
}

function whackReadResponseFromDom() {
  whackResponseDraft = {
    adminResponseStatus: document.getElementById('whack-response-status')?.value || 'none',
    adminResponse: document.getElementById('whack-response-text')?.value?.trim() || '',
  };
}

async function whackReload() {
  whackReadResponseFromDom();
  await loadHallOfFamePanel();
}

async function whackSearch() {
  whackQuery = document.getElementById('whack-q')?.value?.trim() || '';
  await loadHallOfFamePanel();
}

function whackToggleFeedback(id, checked) {
  const key = String(id);
  if (checked) whackSelectedFeedback.add(key);
  else whackSelectedFeedback.delete(key);
}

async function whackMergeSelected() {
  whackReadResponseFromDom();
  const selectedIds = [...whackSelectedFeedback].map(Number).filter((id) => id > 0);
  if (selectedIds.length < 2) {
    alert('묶을 제보를 2건 이상 선택해 주세요.');
    return;
  }
  try {
    const { data } = await api('/hall-of-fame/developer-feedback/groups/merge', {
      method: 'POST',
      body: JSON.stringify({ feedbackIds: selectedIds }),
    });
    whackSelectedFeedback = new Set();
    whackSelectedGroupId = data.groupId;
    await loadHallOfFamePanel();
    alert(`묶음 G#${data.groupId}으로 합쳤습니다.`);
  } catch (error) {
    alert(error.message);
  }
}

async function whackSaveResponse() {
  if (!whackSelectedGroupId) return;
  whackReadResponseFromDom();
  try {
    await api(`/hall-of-fame/developer-feedback/groups/${whackSelectedGroupId}`, {
      method: 'PATCH',
      body: JSON.stringify(whackResponseDraft),
    });
    await loadHallOfFamePanel();
    alert('답변이 저장되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

window.whackSelectGroup = whackSelectGroup;
window.whackReload = whackReload;
window.whackSearch = whackSearch;
window.whackToggleFeedback = whackToggleFeedback;
window.whackMergeSelected = whackMergeSelected;
window.whackSaveResponse = whackSaveResponse;

async function loadHallOfFame() {
  await loadHallOfFamePanel();
}
