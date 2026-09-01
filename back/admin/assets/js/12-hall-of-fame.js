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
    if (!hofEditingId && state.hallOfFameEntries.length) {
      await selectHallOfFameEntry(state.hallOfFameEntries[0].id);
    } else {
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
      ? '<span class="pill pill-ok" style="font-size:10px;margin-left:6px">공개</span>'
      : '<span class="pill" style="font-size:10px;margin-left:6px">비공개</span>';
    return `
      <button type="button" class="${active}" onclick="selectHallOfFameEntry(${item.id})">
        <div class="hof-list-title">#${item.id} ${esc(item.summary.slice(0, 36))}${item.summary.length > 36 ? '…' : ''}</div>
        <div class="hof-list-meta">등재 ${item.honorees?.length || 0}명 · 제보 ${item.feedbackIds?.length || 0}건 ${pub}</div>
      </button>
    `;
  }).join('');

  const honoreeRows = (hofForm.honorees || []).map((h, idx) => `
    <tr>
      <td><input type="text" value="${esc(h.displayName)}" onchange="hofUpdateHonoree(${idx}, 'displayName', this.value)" style="width:100%" /></td>
      <td><input type="text" value="${esc(h.schoolName)}" onchange="hofUpdateHonoree(${idx}, 'schoolName', this.value)" style="width:100%" /></td>
      <td>${h.userId ? `#${h.userId}` : '-'}</td>
      <td><button type="button" class="btn btn-sm btn-red" onclick="hofRemoveHonoree(${idx})">삭제</button></td>
    </tr>
  `).join('');

  const feedbackRows = hofFeedbackItems.map((fb) => {
    const checked = hofSelectedFeedback.has(String(fb.id)) ? 'checked' : '';
    const linked = (fb.linkedEntryIds || []).length
      ? `<span class="txt-muted" style="font-size:11px">연결 #${fb.linkedEntryIds.join(', #')}</span>`
      : '';
    const who = fb.username
      ? `@${esc(fb.username)} · ${esc(fb.maskedName)} · ${esc(fb.schoolName)}`
      : '비로그인';
    return `
      <label class="hof-feedback-row">
        <input type="checkbox" ${checked} onchange="hofToggleFeedback(${fb.id}, this.checked)" />
        <div>
          <div><strong>#${fb.id}</strong> ${esc(fb.category)} · ${who} ${linked}</div>
          <div class="txt-muted" style="font-size:12px;margin-top:4px">${esc(fb.content.slice(0, 120))}${fb.content.length > 120 ? '…' : ''}</div>
        </div>
      </label>
    `;
  }).join('');

  host.innerHTML = `
    <div class="hof-layout">
      <div class="hof-list-col">
        <div class="toolbar" style="margin-bottom:8px">
          <button type="button" class="btn btn-sm btn-primary" onclick="hofNewEntry()">+ 새 등재</button>
        </div>
        <div class="hof-list">${listHtml || '<div class="txt-muted" style="font-size:13px">등록된 항목이 없습니다.</div>'}</div>
      </div>
      <div class="hof-editor-col">
        <div class="section-title">${hofEditingId ? `등재 수정 #${hofEditingId}` : '새 등재 작성'}</div>
        <div class="form-grid" style="margin-bottom:12px">
          <label>반영 내용 요약</label>
          <textarea id="hof-summary" rows="3" placeholder="예: 급식 화면 로딩 속도 개선">${esc(hofForm.summary)}</textarea>
          <label>정렬 (큰 값이 앞)</label>
          <input id="hof-sort" type="number" value="${Number(hofForm.sortOrder) || 0}" />
          <label><input id="hof-published" type="checkbox" ${hofForm.isPublished ? 'checked' : ''} /> 앱에 공개</label>
        </div>

        <div class="section-title" style="margin-top:8px">등재자</div>
        <div class="toolbar" style="margin-bottom:8px;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-sm" onclick="hofAddHonoreeRow()">등재자 행 추가</button>
          <button type="button" class="btn btn-sm btn-primary" onclick="hofAddHonoreesFromFeedback()">선택한 제보로 등재자 추가</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>이름(마스킹)</th>
                <th>학교</th>
                <th style="width:70px">UID</th>
                <th style="width:70px"></th>
              </tr>
            </thead>
            <tbody>${honoreeRows || '<tr><td colspan="4" class="empty-row">등재자를 추가하세요.</td></tr>'}</tbody>
          </table>
        </div>

        <div class="section-title" style="margin-top:16px">회초리 제보 연결</div>
        <p class="section-hint">체크한 제보와 이 등재 건을 연결합니다. 「선택한 제보로 등재자 추가」로 이름·학교를 자동 채울 수 있어요.</p>
        <div class="toolbar" style="margin-bottom:8px">
          <input id="hof-feedback-q" type="text" placeholder="제보 #번호 · @아이디 · 내용" style="min-width:220px" />
          <button type="button" class="btn btn-sm" onclick="hofSearchFeedback()">검색</button>
        </div>
        <div class="hof-feedback-list">${feedbackRows || '<div class="txt-muted">제보가 없습니다.</div>'}</div>

        <div class="toolbar" style="margin-top:16px;gap:8px">
          <button type="button" class="btn btn-primary" onclick="hofSaveEntry()">저장</button>
          ${hofEditingId ? `<button type="button" class="btn btn-red" onclick="hofDeleteEntry(${hofEditingId})">삭제</button>` : ''}
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
      displayName: fb.maskedName || '',
      schoolName: fb.schoolName || '—',
      sortOrder: hofForm.honorees.length,
    });
  }
  hofForm.feedbackIds = [...hofSelectedFeedback].map((id) => Number(id));
  renderHallOfFamePanel();
}

async function hofSearchFeedback() {
  const q = document.getElementById('hof-feedback-q')?.value?.trim() || '';
  try {
    const { data } = await api(`/hall-of-fame/developer-feedback?limit=80&q=${encodeURIComponent(q)}`);
    hofFeedbackItems = data.items || [];
    renderHallOfFamePanel();
  } catch (error) {
    alert(error.message);
  }
}

async function hofSaveEntry() {
  hofReadFormFromDom();
  const payload = {
    summary: hofForm.summary,
    sortOrder: hofForm.sortOrder,
    isPublished: hofForm.isPublished,
    honorees: hofForm.honorees,
    feedbackIds: hofForm.feedbackIds,
  };
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
    alert('저장되었습니다.');
  } catch (error) {
    alert(error.message);
  }
}

async function hofDeleteEntry(id) {
  if (!confirm('이 등재 항목을 삭제할까요?')) return;
  try {
    await api(`/hall-of-fame/${id}`, { method: 'DELETE' });
    resetHofForm();
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
window.hofSaveEntry = hofSaveEntry;
window.hofDeleteEntry = hofDeleteEntry;

async function loadHallOfFame() {
  await loadHallOfFamePanel();
}
