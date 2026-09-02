let hofEditingId = null;
let hofForm = {
  summary: '',
  sortOrder: 0,
  isPublished: false,
  honorees: [],
  feedbackIds: [],
};
let hofFeedbackItems = [];
let hofSelectedFeedback = new Set();
let hofFeedbackQuery = '';
let hofRespondingGroupId = null;
let hofResponseDraft = { adminResponseStatus: 'none', adminResponse: '' };

function hofAdminStatusLabel(status) {
  if (status === 'fixed') return '반영 완료';
  if (status === 'planned') return '도입 예정';
  if (status === 'declined') return '도입 불가';
  return '미답변';
}

function resetHofForm() {
  hofEditingId = null;
  hofForm = {
    summary: '',
    sortOrder: 0,
    isPublished: false,
    honorees: [],
    feedbackIds: [],
  };
  hofSelectedFeedback = new Set();
}

async function loadHallOfFamePanel() {
  const host = document.getElementById('hall-of-fame-host');
  if (!host) return;
  host.innerHTML = '<div class="txt-muted">불러오는 중…</div>';
  try {
    const [{ data: listData }, { data: feedbackData }] = await Promise.all([
      api('/hall-of-fame'),
      api('/hall-of-fame/developer-feedback?limit=80'),
    ]);
    state.hallOfFameEntries = listData.items || [];
    hofFeedbackItems = feedbackData.items || [];
    const keepId = hofEditingId;
    if (keepId && (state.hallOfFameEntries || []).some((e) => e.id === keepId)) {
      await selectHallOfFameEntry(keepId);
    } else if (!hofEditingId && state.hallOfFameEntries.length) {
      await selectHallOfFameEntry(state.hallOfFameEntries[0].id);
    } else {
      if (keepId) resetHofForm();
      renderHallOfFamePanel();
    }
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">불러오지 못했습니다: ${esc(error.message)}</div>`;
  }
}

function renderHallOfFamePanel() {
  const host = document.getElementById('hall-of-fame-host');
  if (!host) return;

  const listHtml = (state.hallOfFameEntries || []).map((item) => {
    const active = hofEditingId === item.id ? 'hof-list-item active' : 'hof-list-item';
    const pub = item.isPublished
      ? '<span class="pill pill-ok" style="font-size:10px">공개</span>'
      : '<span class="pill" style="font-size:10px">비공개</span>';
    return `
      <div class="${active}">
        <button type="button" class="hof-list-item-main" onclick="selectHallOfFameEntry(${item.id})">
          <div class="hof-list-title">#${item.id} ${esc(item.summary.slice(0, 36))}${item.summary.length > 36 ? '…' : ''}</div>
          <div class="hof-list-meta">등재 ${item.honorees?.length || 0}명 · 제보 ${item.feedbackIds?.length || 0}건 ${pub}</div>
        </button>
        <div class="hof-list-item-actions">
          <button type="button" class="btn btn-sm" onclick="selectHallOfFameEntry(${item.id})">수정</button>
          <button type="button" class="btn btn-sm btn-red" onclick="hofDeleteEntry(${item.id}, event)">삭제</button>
        </div>
      </div>
    `;
  }).join('');

  const honoreeRows = (hofForm.honorees || []).map((h, idx) => `
    <tr>
      <td><input type="text" class="note-input" value="${esc(h.displayName)}" onchange="hofUpdateHonoree(${idx}, 'displayName', this.value)" /></td>
      <td><input type="text" class="note-input" value="${esc(h.schoolName)}" onchange="hofUpdateHonoree(${idx}, 'schoolName', this.value)" /></td>
      <td class="txt-muted txt-center">${h.userId ? `#${h.userId}` : '—'}</td>
      <td class="txt-center"><button type="button" class="btn btn-sm btn-red" onclick="hofRemoveHonoree(${idx})">삭제</button></td>
    </tr>
  `).join('');

  const feedbackRows = hofFeedbackItems.map((fb) => {
    const checked = hofSelectedFeedback.has(String(fb.id)) ? 'checked' : '';
    const linked = (fb.linkedEntryIds || []).length
      ? `<span class="pill pill-white" style="font-size:10px">연결 #${fb.linkedEntryIds.join(', #')}</span>`
      : '';
    const who = fb.username
      ? `@${esc(fb.username)} · ${esc(fb.maskedName)} · ${esc(fb.schoolName)}`
      : '비로그인';
    const honoreeLine = fb.honoreeName
      ? `<span class="pill pill-ok" style="font-size:10px">희망명 ${esc(fb.honoreeName)}</span>`
      : '';
    const schoolLine = fb.schoolPublic
      ? '<span class="pill pill-white" style="font-size:10px">학교 공개</span>'
      : '<span class="pill" style="font-size:10px">학교 비공개</span>';
    const categoryPill = fb.category === 'bug'
      ? '<span class="pill pill-danger" style="font-size:10px">버그</span>'
      : fb.category === 'feature'
        ? '<span class="pill pill-ok" style="font-size:10px">기능</span>'
        : '<span class="pill" style="font-size:10px">기타</span>';
    const responsePill = fb.adminResponseStatus && fb.adminResponseStatus !== 'none'
      ? `<span class="pill pill-white" style="font-size:10px">${hofAdminStatusLabel(fb.adminResponseStatus)}</span>`
      : '';
    const groupLine = fb.groupId
      ? `<span class="pill pill-white" style="font-size:10px">묶음 G#${fb.groupId} · ${fb.groupMemberCount || 1}명</span>`
      : '';
    return `
      <label class="hof-feedback-row">
        <input type="checkbox" ${checked} onchange="hofToggleFeedback(${fb.id}, this.checked)" />
        <div style="flex:1;min-width:0">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">
            <strong>#${fb.id}</strong>
            ${groupLine}
            ${categoryPill}
            ${honoreeLine}
            ${schoolLine}
            ${responsePill}
            <span>${who}</span>
            ${linked}
            <button type="button" class="btn btn-sm" onclick="event.preventDefault(); event.stopPropagation(); hofOpenGroupResponse(${fb.groupId})">답변</button>
          </div>
          <div class="hof-feedback-meta">${esc(fb.content.slice(0, 160))}${fb.content.length > 160 ? '…' : ''}</div>
          ${fb.adminResponse ? `<div class="hof-feedback-meta txt-muted">답변: ${esc(fb.adminResponse.slice(0, 120))}${fb.adminResponse.length > 120 ? '…' : ''}</div>` : ''}
        </div>
      </label>
    `;
  }).join('');

  const editorTitle = hofEditingId ? `등재 수정 #${hofEditingId}` : '새 등재 작성';
  const publishPill = hofForm.isPublished
    ? '<span class="pill pill-ok">공개</span>'
    : '<span class="pill">비공개</span>';

  host.innerHTML = `
    <div class="hof-layout">
      <aside class="hof-list-col">
        <div class="hof-panel-card">
          <div class="hof-panel-card-head">
            <div class="hof-panel-card-title">등재 목록</div>
            <button type="button" class="btn btn-sm btn-primary" onclick="hofNewEntry()">+ 새 등재</button>
          </div>
          <div class="hof-list">${listHtml || '<div class="txt-muted" style="font-size:13px;padding:12px">등록된 항목이 없습니다.</div>'}</div>
        </div>
      </aside>
      <div class="hof-editor-col">
        <div class="hof-panel-card">
          <div class="hof-panel-card-head">
            <div class="hof-panel-card-title">${editorTitle}</div>
            ${hofEditingId ? publishPill : ''}
          </div>

          <div class="hof-section">
            <div class="section-title">기본 정보</div>
            <div class="form-grid form-grid-single">
              <label class="form-field">
                <span class="form-field-label">반영 내용 요약</span>
                <textarea id="hof-summary" class="note-input" rows="3" style="min-height:84px" placeholder="예: 급식 화면 로딩 속도 개선">${esc(hofForm.summary)}</textarea>
              </label>
              <div class="form-grid form-grid-inline">
                <label class="form-field">
                  <span class="form-field-label">정렬 (큰 값이 앞)</span>
                  <input id="hof-sort" class="note-input input-compact" type="number" value="${Number(hofForm.sortOrder) || 0}" />
                </label>
                <label class="form-field-check">
                  <input id="hof-published" type="checkbox" ${hofForm.isPublished ? 'checked' : ''} />
                  <span>앱에 공개</span>
                </label>
              </div>
            </div>
          </div>

          <div class="hof-section">
            <div class="section-title">등재자</div>
            <div class="toolbar" style="margin-bottom:10px">
              <button type="button" class="btn btn-sm" onclick="hofAddHonoreeRow()">등재자 행 추가</button>
              <button type="button" class="btn btn-sm btn-primary" onclick="hofAddHonoreesFromFeedback()">선택한 제보로 등재자 추가</button>
            </div>
            <div class="table-wrap hof-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>이름(마스킹)</th>
                    <th>학교</th>
                    <th style="width:72px">UID</th>
                    <th style="width:72px"></th>
                  </tr>
                </thead>
                <tbody>${honoreeRows || '<tr><td colspan="4" class="empty-row">등재자를 추가하세요.</td></tr>'}</tbody>
              </table>
            </div>
          </div>

          <div class="hof-section">
            <div class="section-title">회초리 제보 연결</div>
            <p class="section-hint">체크한 제보와 이 등재 건을 연결합니다. 제보의 희망 표시명(최대 10자)·학교 공개 여부가 등재자 추가에 반영됩니다.</p>
            <div class="toolbar filter-row" style="margin:0 0 10px">
              <input id="hof-feedback-q" class="note-input input-compact" type="text" placeholder="제보 #번호 · @아이디 · 내용" style="flex:1;min-width:180px" value="${esc(hofFeedbackQuery)}" />
              <button type="button" class="btn btn-sm" onclick="hofSearchFeedback()">검색</button>
              <button type="button" class="btn btn-sm btn-primary" onclick="hofMergeSelectedAndRespond()">선택 묶어서 답변</button>
            </div>
            <div class="hof-feedback-list">${feedbackRows || '<div class="txt-muted" style="padding:12px;font-size:12px">제보가 없습니다.</div>'}</div>
            ${hofRespondingGroupId ? `
              <div class="hof-feedback-response-panel" style="margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2)">
                <div class="section-title" style="margin-bottom:8px">묶음 G#${hofRespondingGroupId} 답변</div>
                <div class="form-grid form-grid-single">
                  <label class="form-field">
                    <span class="form-field-label">상태</span>
                    <select id="hof-fb-response-status" class="note-input">
                      <option value="none" ${hofResponseDraft.adminResponseStatus === 'none' ? 'selected' : ''}>미답변</option>
                      <option value="fixed" ${hofResponseDraft.adminResponseStatus === 'fixed' ? 'selected' : ''}>반영 완료</option>
                      <option value="planned" ${hofResponseDraft.adminResponseStatus === 'planned' ? 'selected' : ''}>도입 예정</option>
                      <option value="declined" ${hofResponseDraft.adminResponseStatus === 'declined' ? 'selected' : ''}>도입 불가</option>
                    </select>
                  </label>
                  <label class="form-field">
                    <span class="form-field-label">답변 내용 (앱에 표시, 최대 500자)</span>
                    <textarea id="hof-fb-response-text" class="note-input" rows="3" style="min-height:72px" placeholder="예: 버그를 수정했어요. / 다음 업데이트에 반영 예정이에요.">${esc(hofResponseDraft.adminResponse)}</textarea>
                  </label>
                </div>
                <div class="toolbar" style="margin-top:8px">
                  <button type="button" class="btn btn-sm btn-primary" onclick="hofSaveFeedbackResponse()">답변 저장</button>
                  <button type="button" class="btn btn-sm" onclick="hofCloseFeedbackResponse()">닫기</button>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="hof-actions toolbar">
            <button type="button" class="btn btn-primary" onclick="hofSaveEntry()">${hofEditingId ? '수정 저장' : '등록'}</button>
            ${hofEditingId ? `<button type="button" class="btn" onclick="hofNewEntry()">새로 작성</button>` : ''}
            ${hofEditingId ? `<button type="button" class="btn btn-red" onclick="hofDeleteEntry(${hofEditingId})">영구 삭제</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function hofReadFormFromDom() {
  hofForm.summary = document.getElementById('hof-summary')?.value?.trim() || '';
  hofForm.sortOrder = Number(document.getElementById('hof-sort')?.value || 0);
  hofForm.isPublished = Boolean(document.getElementById('hof-published')?.checked);
  hofForm.feedbackIds = [...hofSelectedFeedback].map((id) => Number(id));
}

async function selectHallOfFameEntry(id) {
  try {
    const { data } = await api(`/hall-of-fame/${id}`);
    hofEditingId = data.id;
    hofForm = {
      summary: data.summary || '',
      sortOrder: data.sortOrder || 0,
      isPublished: Boolean(data.isPublished),
      honorees: (data.honorees || []).map((h) => ({
        userId: h.userId,
        displayName: h.displayName,
        schoolName: h.schoolName,
        sortOrder: h.sortOrder,
      })),
      feedbackIds: data.feedbackIds || [],
    };
    hofSelectedFeedback = new Set((data.feedbackIds || []).map(String));
    renderHallOfFamePanel();
  } catch (error) {
    alert(error.message);
  }
}

function hofNewEntry() {
  resetHofForm();
  renderHallOfFamePanel();
}

function hofUpdateHonoree(idx, key, value) {
  if (!hofForm.honorees[idx]) return;
  hofForm.honorees[idx][key] = value;
}

function hofRemoveHonoree(idx) {
  hofForm.honorees.splice(idx, 1);
  renderHallOfFamePanel();
}

function hofAddHonoreeRow() {
  hofReadFormFromDom();
  hofForm.honorees.push({
    userId: null,
    displayName: '',
    schoolName: '—',
    sortOrder: hofForm.honorees.length,
  });
  renderHallOfFamePanel();
}

function hofToggleFeedback(id, checked) {
  const key = String(id);
  if (checked) hofSelectedFeedback.add(key);
  else hofSelectedFeedback.delete(key);
}

async function hofAddHonoreesFromFeedback() {
  hofReadFormFromDom();
  const selected = hofFeedbackItems.filter((fb) => hofSelectedFeedback.has(String(fb.id)));
  if (!selected.length) {
    alert('제보를 먼저 선택해 주세요.');
    return;
  }
  for (const fb of selected) {
    if (!fb.userId) continue;
    const exists = hofForm.honorees.some((h) => h.userId === fb.userId);
    if (exists) continue;
    hofForm.honorees.push({
      userId: fb.userId,
      displayName: (fb.honoreeName || fb.maskedName || '').slice(0, 32),
      schoolName: fb.schoolPublic ? (fb.schoolName || '—') : '—',
      sortOrder: hofForm.honorees.length,
    });
  }
  hofForm.feedbackIds = [...hofSelectedFeedback].map((id) => Number(id));
  renderHallOfFamePanel();
}

async function hofSearchFeedback() {
  hofFeedbackQuery = document.getElementById('hof-feedback-q')?.value?.trim() || '';
  try {
    const { data } = await api(`/hall-of-fame/developer-feedback?limit=80&q=${encodeURIComponent(hofFeedbackQuery)}`);
    hofFeedbackItems = data.items || [];
    renderHallOfFamePanel();
  } catch (error) {
    alert(error.message);
  }
}

function hofOpenGroupResponse(groupId) {
  hofReadFormFromDom();
  const gid = Number(groupId);
  if (!Number.isFinite(gid) || gid < 1) return;
  const sample = hofFeedbackItems.find((item) => item.groupId === gid);
  hofRespondingGroupId = gid;
  hofResponseDraft = {
    adminResponseStatus: sample?.adminResponseStatus || 'none',
    adminResponse: sample?.adminResponse || '',
  };
  renderHallOfFamePanel();
}

function hofCloseFeedbackResponse() {
  hofRespondingGroupId = null;
  hofResponseDraft = { adminResponseStatus: 'none', adminResponse: '' };
  renderHallOfFamePanel();
}

async function hofMergeSelectedAndRespond() {
  hofReadFormFromDom();
  const selectedIds = [...hofSelectedFeedback].map((id) => Number(id)).filter((id) => id > 0);
  if (selectedIds.length < 2) {
    alert('묶을 제보를 2건 이상 선택해 주세요.');
    return;
  }
  try {
    const { data } = await api('/hall-of-fame/developer-feedback/groups/merge', {
      method: 'POST',
      body: JSON.stringify({ feedbackIds: selectedIds }),
    });
    const q = hofFeedbackQuery;
    const listRes = await api(`/hall-of-fame/developer-feedback?limit=80&q=${encodeURIComponent(q)}`);
    hofFeedbackItems = listRes.data.items || [];
    hofOpenGroupResponse(data.groupId);
    alert(`묶음 G#${data.groupId}으로 합쳤습니다.`);
  } catch (error) {
    alert(error.message);
  }
}

async function hofSaveFeedbackResponse() {
  const groupId = hofRespondingGroupId;
  if (!groupId) return;
  hofReadFormFromDom();
  const adminResponseStatus = document.getElementById('hof-fb-response-status')?.value || 'none';
  const adminResponse = document.getElementById('hof-fb-response-text')?.value?.trim() || '';
  try {
    await api(`/hall-of-fame/developer-feedback/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ adminResponseStatus, adminResponse }),
    });
    const q = hofFeedbackQuery;
    const { data } = await api(`/hall-of-fame/developer-feedback?limit=80&q=${encodeURIComponent(q)}`);
    hofFeedbackItems = data.items || [];
    const sample = hofFeedbackItems.find((item) => item.groupId === groupId);
    if (sample) {
      hofResponseDraft = {
        adminResponseStatus: sample.adminResponseStatus || 'none',
        adminResponse: sample.adminResponse || '',
      };
    }
    renderHallOfFamePanel();
    alert('답변이 저장되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

async function hofSaveEntry() {
  hofReadFormFromDom();
  if (!hofForm.summary || hofForm.summary.length < 2) {
    alert('반영 내용 요약을 2자 이상 입력해 주세요.');
    return;
  }
  if (!hofForm.honorees.length) {
    alert('등재자를 1명 이상 추가해 주세요.');
    return;
  }
  const payload = {
    summary: hofForm.summary,
    sortOrder: hofForm.sortOrder,
    isPublished: hofForm.isPublished,
    honorees: hofForm.honorees,
    feedbackIds: hofForm.feedbackIds,
  };
  const wasEditing = Boolean(hofEditingId);
  try {
    if (hofEditingId) {
      await api(`/hall-of-fame/${hofEditingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      const { data } = await api('/hall-of-fame', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      hofEditingId = data.id;
    }
    await loadHallOfFamePanel();
    alert(wasEditing ? '수정되었습니다.' : '등록되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

async function hofDeleteEntry(id, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  const entryId = Number(id);
  if (!Number.isFinite(entryId) || entryId < 1) return;
  const item = (state.hallOfFameEntries || []).find((e) => e.id === entryId);
  const label = item?.summary ? item.summary.slice(0, 40) : `#${entryId}`;
  const ok = confirm(
    `등재 #${entryId} 「${label}」을(를) 영구 삭제할까요?\n\n등재자·제보 연결도 함께 삭제되며 복구할 수 없습니다.`,
  );
  if (!ok) return;
  try {
    await api(`/hall-of-fame/${entryId}`, { method: 'DELETE' });
    if (hofEditingId === entryId) resetHofForm();
    await loadHallOfFamePanel();
    alert('삭제되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

window.selectHallOfFameEntry = selectHallOfFameEntry;
window.hofNewEntry = hofNewEntry;
window.hofUpdateHonoree = hofUpdateHonoree;
window.hofRemoveHonoree = hofRemoveHonoree;
window.hofAddHonoreeRow = hofAddHonoreeRow;
window.hofToggleFeedback = hofToggleFeedback;
window.hofAddHonoreesFromFeedback = hofAddHonoreesFromFeedback;
window.hofSearchFeedback = hofSearchFeedback;
window.hofOpenGroupResponse = hofOpenGroupResponse;
window.hofMergeSelectedAndRespond = hofMergeSelectedAndRespond;
window.hofCloseFeedbackResponse = hofCloseFeedbackResponse;
window.hofSaveFeedbackResponse = hofSaveFeedbackResponse;
window.hofSaveEntry = hofSaveEntry;
window.hofDeleteEntry = hofDeleteEntry;

async function loadHallOfFame() {
  await loadHallOfFamePanel();
}
