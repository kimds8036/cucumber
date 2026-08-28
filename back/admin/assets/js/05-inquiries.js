async function loadInquiries() {
    const q = document.getElementById('inquiry-search-q')?.value?.trim() || '';
    const fromDate = document.getElementById('inquiry-filter-from-date')?.value || '';
    const toDate = document.getElementById('inquiry-filter-to-date')?.value || '';
    const qs = new URLSearchParams();
    qs.set('view', 'pending');
    if (q) qs.set('q', q);
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    qs.set('limit', '50');
    const { data } = await api(`/inquiries?${qs.toString()}`);
    state.inquiries = data.inquiries || [];
    renderInquiries();
  }

  async function loadProcessedInquiries() {
    const q = document.getElementById('processed-inquiry-search-q')?.value?.trim() || '';
    const status = document.getElementById('processed-inquiry-filter-status')?.value || '';
    const fromDate = document.getElementById('processed-inquiry-filter-from-date')?.value || '';
    const toDate = document.getElementById('processed-inquiry-filter-to-date')?.value || '';
    const qs = new URLSearchParams();
    qs.set('view', 'processed');
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    qs.set('limit', '50');
    const { data } = await api(`/inquiries?${qs.toString()}`);
    state.processedInquiries = data.inquiries || [];
    renderProcessedInquiries();
  }

  function renderDuplicateBadge(i) {
    if (!i?.duplicateWarning) return '';
    const n = i.duplicateClusterSize || 2;
    const mins = i.duplicateWindowMinutes || 5;
    return `<span class="pill pill-warn inquiry-dup-badge" title="같은 아이디·이메일 ${mins}분 내 ${n}건">중복 ${n}건</span>`;
  }

  function renderDuplicateDetailBanner(i) {
    if (!i?.duplicateWarning) return '';
    const n = i.duplicateClusterSize || 2;
    const mins = i.duplicateWindowMinutes || 5;
    return `<div class="inquiry-dup-banner">⚠ 같은 아이디·이메일로 ${mins}분 이내 접수된 문의가 ${n}건 있습니다. 중복 제출·연타 가능성을 확인해주세요.</div>`;
  }

  function renderContactCell(i) {
    const email = i.contact_email || '';
    const username = i.contact_username || '';
    const emailRow = email
      ? `<div class="contact-row"><span class="contact-text" title="${esc(email)}">${esc(email)}</span><button type="button" class="copy-btn" title="이메일 복사" onclick="copyTextFromAttr(event, this)" data-copy="${esc(email)}" data-label="이메일">복사</button></div>`
      : `<div class="contact-row contact-empty">이메일 없음</div>`;
    const usernameRow = username
      ? `<div class="contact-row"><span class="contact-text" title="${esc(username)}">@${esc(username)}</span><button type="button" class="copy-btn" title="아이디 복사" onclick="copyTextFromAttr(event, this)" data-copy="${esc(username)}" data-label="아이디">복사</button></div>`
      : `<div class="contact-row contact-empty">아이디 미입력</div>`;
    return `<div class="contact-cell" onclick="event.stopPropagation()">${emailRow}${usernameRow}</div>`;
  }

  function renderInquiries() {
    const tbody = document.getElementById('inquiry-tbody');
    if (!state.inquiries.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="txt-muted">미처리 문의가 없습니다.</td></tr>`;
      document.getElementById('inquiry-detail-host').innerHTML = '';
      updateInquiryBulk();
      return;
    }
    tbody.innerHTML = state.inquiries.map((i) => {
      const checked = state.inquirySelected.has(String(i.id)) ? 'checked' : '';
      const isSelected = state.selectedInquiryId === i.id;
      const author = i.user_id
        ? `${esc(i.author_username || `UID #${i.user_id}`)}`
        : `<span class="txt-muted">비로그인</span>`;
      return `
        <tr class="clickable ${isSelected ? 'selected-row' : ''}" onclick="toggleInquiryDetail(${i.id}, event)">
          <td onclick="event.stopPropagation()">
            <input type="checkbox" class="inquiry-row-chk" data-id="${i.id}" ${checked} onchange="toggleInquirySelection(${i.id}, this.checked)">
          </td>
          <td>#Q-${i.id} ${renderDuplicateBadge(i)}</td>
          <td>${author}</td>
          <td class="txt-ellipsis">${esc(i.content || '-')}</td>
          <td>${renderContactCell(i)}</td>
          <td class="txt-muted">${fmtDate(i.created_at)}</td>
          <td><span class="pill ${inquiryStatusPill(i.status)}">${esc(inquiryStatusLabel(i.status))}</span></td>
        </tr>
      `;
    }).join('');
    updateInquiryBulk();
    renderInquiryDetail();
  }

  function renderProcessedInquiries() {
    const tbody = document.getElementById('processed-inquiry-tbody');
    if (!state.processedInquiries.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="txt-muted">처리된 문의가 없습니다.</td></tr>`;
      document.getElementById('processed-inquiry-detail-host').innerHTML = '';
      return;
    }
    tbody.innerHTML = state.processedInquiries.map((i) => {
      const isSelected = state.selectedProcessedInquiryId === i.id;
      const isExpanded = state.expandedProcessedInquiryIds.has(String(i.id));
      const author = i.user_id
        ? `${esc(i.author_username || `UID #${i.user_id}`)}`
        : `<span class="txt-muted">비로그인</span>`;
      const answerPreview = i.answer_content
        ? esc(i.answer_content)
        : '<span class="txt-muted">(답변 본문 없음 — 종결만 처리되었을 수 있음)</span>';
      const notePreview = i.answer_note
        ? `<div class="inquiry-answer-meta">내부 메모</div><p class="inquiry-answer-preview">${esc(i.answer_note)}</p>`
        : '';
      return `
        <tr class="clickable ${isSelected ? 'selected-row' : ''}" onclick="toggleProcessedInquiryDetail(${i.id}, event)">
          <td onclick="event.stopPropagation()">
            <button type="button" class="inquiry-expand-btn" title="답변 보기" onclick="toggleProcessedInquiryAnswer(${i.id}, event)">${isExpanded ? '▴' : '▾'}</button>
          </td>
          <td>#Q-${i.id} ${renderDuplicateBadge(i)}</td>
          <td>${author}</td>
          <td class="txt-ellipsis">${esc(i.content || '-')}</td>
          <td>${renderContactCell(i)}</td>
          <td>${esc(i.answered_by_username || (i.answered_by ? `admin #${i.answered_by}` : '-'))}</td>
          <td class="txt-muted">${fmtDate(i.answered_at || i.updated_at)}</td>
          <td><span class="pill ${inquiryStatusPill(i.status)}">${esc(inquiryStatusLabel(i.status))}</span></td>
          <td onclick="event.stopPropagation()">
            <button class="btn btn-sm" onclick="openInquiryReopenDialog(${i.id})">재오픈</button>
          </td>
        </tr>
        ${isExpanded ? `
          <tr class="inquiry-expand-row">
            <td colspan="9">
              <div class="inquiry-answer-meta">관리자 답변 · ${fmtDate(i.answered_at || i.updated_at)} · ${esc(i.answered_by_username || (i.answered_by ? `admin #${i.answered_by}` : '-'))}</div>
              <p class="inquiry-answer-preview">${answerPreview}</p>
              ${notePreview}
              <div style="margin-top:8px;">
                <button type="button" class="btn btn-sm" onclick="toggleProcessedInquiryDetail(${i.id})">상세·수정 열기</button>
              </div>
            </td>
          </tr>
        ` : ''}
      `;
    }).join('');
    renderProcessedInquiryDetail();
  }

  function toggleProcessedInquiryAnswer(id, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const key = String(id);
    if (state.expandedProcessedInquiryIds.has(key)) {
      state.expandedProcessedInquiryIds.delete(key);
    } else {
      state.expandedProcessedInquiryIds.add(key);
    }
    renderProcessedInquiries();
  }

  // ───────── 클립보드 복사 (관리자 페이지 공용) ─────────
  function showCopyToast(message) {
    let host = document.getElementById('copy-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'copy-toast-host';
      host.style.cssText =
        'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText =
      'background:#1a1a18;color:#fff;padding:8px 14px;border-radius:18px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,0.18);opacity:0;transition:opacity .15s ease;';
    host.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 200);
    }, 1400);
  }

  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // fallback below
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  async function copyTextFromAttr(event, btn) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!btn) return;
    const text = btn.getAttribute('data-copy') || '';
    const label = btn.getAttribute('data-label') || '';
    if (!text) {
      showCopyToast('복사할 값이 없습니다.');
      return;
    }
    const ok = await copyTextToClipboard(text);
    showCopyToast(ok ? `${label}이(가) 복사되었습니다.` : '복사에 실패했습니다.');
  }

  function toggleInquirySelection(id, checked) {
    const key = String(id);
    if (checked) state.inquirySelected.add(key);
    else state.inquirySelected.delete(key);
    updateInquiryBulk();
  }

  function toggleAllInquiries(chk) {
    state.inquirySelected.clear();
    if (chk.checked) state.inquiries.forEach((i) => state.inquirySelected.add(String(i.id)));
    renderInquiries();
  }

  function clearInquirySelection() {
    state.inquirySelected.clear();
    renderInquiries();
  }

  function updateInquiryBulk() {
    const loadedIds = new Set(state.inquiries.map((i) => String(i.id)));
    const count = [...state.inquirySelected].filter((id) => loadedIds.has(id)).length;
    const bar = document.getElementById('inquiry-bulk-bar');
    document.getElementById('inquiry-bulk-count').textContent = `${count}건 선택됨`;
    if (bar) bar.classList.toggle('show', count > 0);
    document.querySelectorAll('#inquiry-tbody tr').forEach((tr) => {
      const chk = tr.querySelector('.inquiry-row-chk');
      tr.classList.toggle('selected-row', chk && chk.checked);
    });
    const all = document.getElementById('inquiry-chk-all');
    if (all) all.checked = state.inquiries.length > 0 && count === state.inquiries.length;
  }

  function toggleInquiryDetail(id) {
    state.selectedInquiryId = state.selectedInquiryId === id ? null : id;
    renderInquiries();
    if (state.selectedInquiryId) {
      loadInquiryDetail(id, 'inquiry-detail-host', false);
    }
  }

  function toggleProcessedInquiryDetail(id) {
    state.selectedProcessedInquiryId = state.selectedProcessedInquiryId === id ? null : id;
    renderProcessedInquiries();
    if (state.selectedProcessedInquiryId) {
      loadInquiryDetail(id, 'processed-inquiry-detail-host', true);
    }
  }

  function renderInquiryDetail() {
    if (!state.selectedInquiryId) {
      document.getElementById('inquiry-detail-host').innerHTML = '';
    }
  }

  function renderProcessedInquiryDetail() {
    if (!state.selectedProcessedInquiryId) {
      document.getElementById('processed-inquiry-detail-host').innerHTML = '';
    }
  }

  async function loadInquiryDetail(id, hostElId, processed) {
    const host = document.getElementById(hostElId);
    if (!host) return;
    host.innerHTML = `<div class="detail-panel open"><div class="detail-panel-header"><span class="detail-panel-title">#Q-${id} 로딩 중...</span></div></div>`;
    try {
      const { data } = await api(`/inquiries/${id}`);
      const i = data.inquiry;
      const images = Array.isArray(data.images) ? data.images : [];
      const author = i.user_id
        ? `${esc(i.author_username || '-')} (UID #${esc(i.user_id)})${i.author_is_banned ? ' <span class="pill pill-danger" style="font-size:10px">영구정지</span>' : i.author_is_suspended ? ' <span class="pill pill-warn" style="font-size:10px">임시정지</span>' : ''}`
        : `비로그인 사용자`;
      const renderDetailContact = (value, label) => {
        if (!value) {
          return `<span class="txt-muted">${label} 없음</span>`;
        }
        return `<div class="contact-row"><span class="contact-text" title="${esc(value)}">${esc(value)}</span><button type="button" class="copy-btn" title="${label} 복사" onclick="copyTextFromAttr(event, this)" data-copy="${esc(value)}" data-label="${label}">복사</button></div>`;
      };
      const emailCell = renderDetailContact(i.contact_email, '이메일');
      const usernameCell = i.contact_username
        ? `<div class="contact-row"><span class="contact-text" title="${esc(i.contact_username)}">${esc(i.contact_username)}</span><button type="button" class="copy-btn" title="아이디 복사" onclick="copyTextFromAttr(event, this)" data-copy="${esc(i.contact_username)}" data-label="아이디">복사</button></div>`
        : `<span class="txt-muted">아이디 없음</span>`;
      const meta = [
        i.app_version ? `App: ${esc(i.app_version)}` : null,
        i.device_info ? `Device: ${esc(i.device_info)}` : null,
      ].filter(Boolean).join(' / ') || '-';
      const isProcessed = i.status === 'answered' || i.status === 'closed';
      const closeBtn = `<button class="btn btn-amber" onclick="closeInquiry(${i.id})">답변 없이 종결</button>`;
      const reopenBtn = `<button class="btn btn-sm" onclick="openInquiryReopenDialog(${i.id})">재오픈</button>`;
      const deleteBtn = `<button class="btn btn-sm btn-red" onclick="deleteInquiry(${i.id})">삭제</button>`;

      host.innerHTML = `
        <div class="detail-panel open">
          <div class="detail-panel-header">
            <span class="detail-panel-title">#Q-${i.id} — 문의 상세 ${renderDuplicateBadge(i)}</span>
            <button class="btn btn-sm" onclick="closeInquiryDetail(${processed ? 'true' : 'false'})">닫기</button>
          </div>
          ${renderDuplicateDetailBanner(i)}
          <div class="detail-grid">
            <div class="detail-block"><div class="detail-block-label">상태</div><div class="detail-block-value">${esc(inquiryStatusLabel(i.status))}</div></div>
            <div class="detail-block"><div class="detail-block-label">작성자</div><div class="detail-block-value">${author}</div></div>
            <div class="detail-block"><div class="detail-block-label">아이디</div><div class="detail-block-value">${usernameCell}</div></div>
            <div class="detail-block"><div class="detail-block-label">이메일</div><div class="detail-block-value">${emailCell}</div></div>
            <div class="detail-block"><div class="detail-block-label">접수일</div><div class="detail-block-value">${fmtDate(i.created_at)}</div></div>
            <div class="detail-block"><div class="detail-block-label">메타</div><div class="detail-block-value">${meta}</div></div>
          </div>
          <div class="section-title">본문</div>
          <div class="original-content">${esc(i.content || '-')}</div>
          ${images.length ? renderTargetImages(images.map((img) => img.cloudinary_url)) : ''}
          ${i.answered_at ? `
            <div class="section-title">기존 답변 (${fmtDate(i.answered_at)} · ${esc(i.answered_by_username || `admin #${i.answered_by}`)})</div>
            <div class="original-content">${esc(i.answer_content || '-')}</div>
            ${i.answer_note ? `<div class="section-title">내부 메모</div><div class="original-content">${esc(i.answer_note)}</div>` : ''}
          ` : ''}
          <div class="section-title">${i.answered_at ? '답변 수정' : '답변 작성'} (사용자에게 표시)</div>
          <textarea class="note-input" id="inquiry-answer-${i.id}" placeholder="답변 내용을 입력하세요">${esc(i.answer_content || '')}</textarea>
          <div class="section-title">내부 메모 (사용자 비공개)</div>
          <textarea class="note-input" id="inquiry-note-${i.id}" placeholder="운영 내부 메모(선택)">${esc(i.answer_note || '')}</textarea>
          <div class="action-row">
            <button class="btn btn-green" onclick="answerInquiry(${i.id}, false)">답변 등록 (status=answered)</button>
            <button class="btn btn-primary" onclick="answerInquiry(${i.id}, true)">답변 + 종결 (status=closed)</button>
            ${!isProcessed ? closeBtn : ''}
            ${isProcessed ? reopenBtn : ''}
            ${deleteBtn}
          </div>
        </div>
      `;
    } catch (error) {
      host.innerHTML = `<div class="txt-danger">문의 상세 조회 실패: ${esc(error.message)}</div>`;
    }
  }

  function closeInquiryDetail(processed) {
    if (processed === true || processed === 'true') {
      state.selectedProcessedInquiryId = null;
      renderProcessedInquiries();
    } else {
      state.selectedInquiryId = null;
      renderInquiries();
    }
  }

  async function answerInquiry(id, close) {
    const answer = document.getElementById(`inquiry-answer-${id}`)?.value?.trim() || '';
    const note = document.getElementById(`inquiry-note-${id}`)?.value?.trim() || null;
    if (!answer) {
      alert('답변 내용을 입력해주세요.');
      return;
    }
    try {
      // 이미 답변이 있는지 확인 — 있으면 PATCH, 없으면 POST
      const inquiryRow = state.inquiries.find((x) => x.id === id) || state.processedInquiries.find((x) => x.id === id);
      const isEdit = inquiryRow && inquiryRow.status !== 'pending';
      const method = isEdit ? 'PATCH' : 'POST';
      await api(`/inquiries/${id}/answer`, {
        method,
        body: JSON.stringify({ answer_content: answer, answer_note: note, close }),
      });
      await Promise.all([loadDashboard(), loadInquiries(), loadProcessedInquiries(), loadLogs()]);
      alert(isEdit ? '답변이 수정되었습니다.' : '답변이 등록되었습니다.');
      state.selectedInquiryId = null;
      state.selectedProcessedInquiryId = null;
      renderInquiries();
      renderProcessedInquiries();
    } catch (error) {
      alert(error.message);
    }
  }

  async function closeInquiry(id) {
    const note = prompt('종결 메모(선택)', '');
    try {
      await api(`/inquiries/${id}/close`, {
        method: 'PATCH',
        body: JSON.stringify({ note: note || null }),
      });
      await Promise.all([loadDashboard(), loadInquiries(), loadProcessedInquiries(), loadLogs()]);
      alert('문의를 종결 처리했습니다.');
      state.selectedInquiryId = null;
      renderInquiries();
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteInquiry(id) {
    if (!confirm(`#Q-${id} 문의를 삭제(soft delete) 하시겠습니까?`)) return;
    const note = prompt('삭제 메모(선택)', '');
    try {
      await api(`/inquiries/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ note: note || null }),
      });
      await Promise.all([loadDashboard(), loadInquiries(), loadProcessedInquiries(), loadLogs()]);
      alert('문의를 삭제 처리했습니다.');
      state.selectedInquiryId = null;
      state.selectedProcessedInquiryId = null;
      renderInquiries();
      renderProcessedInquiries();
    } catch (error) {
      alert(error.message);
    }
  }

  function openInquiryReopenDialog(id) {
    state.inquiryReopenId = id;
    const input = document.getElementById('inquiry-reopen-note-input');
    if (input) input.value = '';
    document.getElementById('inquiry-reopen-dialog-backdrop').classList.add('show');
  }
  function closeInquiryReopenDialog() {
    state.inquiryReopenId = null;
    document.getElementById('inquiry-reopen-dialog-backdrop').classList.remove('show');
  }
  function closeInquiryReopenDialogByBackdrop(e) {
    if (e.target === e.currentTarget) closeInquiryReopenDialog();
  }
  async function submitInquiryReopenDialog() {
    const id = state.inquiryReopenId;
    if (!id) return;
    const note = document.getElementById('inquiry-reopen-note-input')?.value?.trim();
    if (!note) {
      alert('재오픈 사유를 입력해주세요.');
      return;
    }
    try {
      await api(`/inquiries/${id}/reopen`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      });
      closeInquiryReopenDialog();
      await Promise.all([loadDashboard(), loadInquiries(), loadProcessedInquiries(), loadLogs()]);
      alert('문의를 미처리 상태로 되돌렸습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  function bulkCloseInquiries() {
    const loadedIds = new Set(state.inquiries.map((i) => String(i.id)));
    const ids = [...state.inquirySelected].filter((id) => loadedIds.has(id));
    if (!ids.length) return;
    document.getElementById('inquiry-bulk-close-note-input').value = '';
    document.getElementById('inquiry-bulk-close-dialog-backdrop').classList.add('show');
  }
  function closeInquiryBulkCloseDialog() {
    document.getElementById('inquiry-bulk-close-dialog-backdrop').classList.remove('show');
  }
  function closeInquiryBulkCloseDialogByBackdrop(e) {
    if (e.target === e.currentTarget) closeInquiryBulkCloseDialog();
  }
  async function submitInquiryBulkCloseDialog() {
    const loadedIds = new Set(state.inquiries.map((i) => String(i.id)));
    const ids = [...state.inquirySelected].filter((id) => loadedIds.has(id)).map((v) => Number(v));
    if (!ids.length) {
      closeInquiryBulkCloseDialog();
      return;
    }
    const note = document.getElementById('inquiry-bulk-close-note-input')?.value?.trim() || null;
    try {
      const { data } = await api(`/inquiries/bulk-close`, {
        method: 'POST',
        body: JSON.stringify({ ids, note }),
      });
      closeInquiryBulkCloseDialog();
      state.inquirySelected.clear();
      await Promise.all([loadDashboard(), loadInquiries(), loadProcessedInquiries(), loadLogs()]);
      alert(`${data?.processed ?? 0}건 종결 처리되었습니다.`);
    } catch (error) {
      alert(error.message);
    }
  }

  // /api/admin/inquiries/* 호출용 (상위 API_BASE='/api/admin' 기준 경로 변환)
  // adminInquiries 라우터는 /api/admin/inquiries 에 마운트되어 있으므로
  // 위 호출들은 모두 `${API_BASE}${'/inquiries' + path}` 로 가야 한다.
  // 위 함수들에서 사용한 api('/inquiries...') 는 정상 동작한다.
