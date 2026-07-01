async function loadDashboard() {
    const { data } = await api('/stats');
    document.getElementById('stat-today-new').textContent = String(data.todayNewReports);
    document.getElementById('stat-pending-reports').textContent = String(data.pendingReports);
    document.getElementById('stat-pending-appeals').textContent = String(data.pendingAppeals);
    document.getElementById('stat-today-handled').textContent = String(data.todayHandledReports);
    document.getElementById('badge-reports').textContent = String(data.pendingReports);
    document.getElementById('badge-appeals').textContent = String(data.pendingAppeals);

    try {
      const res = await api('/inquiries/stats');
      const d = res.data || {};
      document.getElementById('stat-pending-inquiries').textContent = String(d.pendingInquiries || 0);
      document.getElementById('stat-today-answered-inquiries').textContent = String(d.todayAnsweredInquiries || 0);
      document.getElementById('badge-inquiries').textContent = String(d.pendingInquiries || 0);
    } catch (e) {
      // 통계 실패는 비치명
    }
  }

  function renderReports() {
    const tbody = document.getElementById('report-tbody');
    if (!state.reports.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="txt-muted">데이터가 없습니다.</td></tr>`;
      document.getElementById('report-detail-host').innerHTML = '';
      updateBulk();
      return;
    }
    const groupsMap = new Map();
    state.reports.forEach((r) => {
      const key = threadKeyOf(r);
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(r);
    });
    const groups = [...groupsMap.entries()].map(([key, items]) => {
      const sorted = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { key, items: sorted, latest: sorted[0] };
    });

    tbody.innerHTML = groups.map((g) => {
      const isExpanded = state.expandedThreads.has(g.key);
      const allChecked = g.items.every((r) => state.selected.has(String(r.id)));
      const someChecked = g.items.some((r) => state.selected.has(String(r.id)));
      const titlePrefix = isExpanded ? '▼' : '▶';
      const summaryRow = `
        <tr class="clickable" onclick="toggleThread('${esc(g.key)}')">
          <td onclick="event.stopPropagation()">
            <input type="checkbox" class="thread-chk" data-thread="${esc(g.key)}" ${allChecked ? 'checked' : ''} ${!allChecked && someChecked ? 'data-indeterminate=\"true\"' : ''} onchange="toggleThreadSelection('${esc(g.key)}', this.checked)">
          </td>
          <td>${titlePrefix} #T-${esc(g.latest.target_type)}-${esc(g.latest.target_id)}</td>
          <td><span class="pill ${reportTypePill(g.latest.target_type)}">${esc(reportTypeLabel(g.latest.target_type))}</span></td>
          <td>${esc(reasonLabel(g.latest.reason))}</td>
          <td class="txt-ellipsis">${esc(g.latest.target_content || g.latest.description || '-')}</td>
          <td class="txt-center ${g.items.length >= 3 ? 'txt-danger' : ''}">${g.items.length}</td>
          <td class="txt-muted">${fmtDate(g.latest.created_at)}</td>
          <td><span class="pill ${statusPill(g.latest.status)}">${esc(statusLabel(g.latest.status))}</span></td>
        </tr>
      `;
      if (!isExpanded) return summaryRow;
      const children = g.items.map((r) => `
        <tr class="clickable ${state.selectedReportId === r.id ? 'selected-row' : ''}" onclick="toggleDetail(${r.id}, event)">
          <td onclick="event.stopPropagation()">
            <input type="checkbox" class="row-chk" data-id="${r.id}" ${state.selected.has(String(r.id)) ? 'checked' : ''} onchange="toggleRowSelection(${r.id}, this.checked)">
          </td>
          <td style="padding-left:22px;">└ #R-${r.id}</td>
          <td><span class="pill ${reportTypePill(r.target_type)}">${esc(reportTypeLabel(r.target_type))}</span></td>
          <td>${esc(reasonLabel(r.reason))}</td>
          <td class="txt-ellipsis">${esc(r.target_content || r.description || '-')}</td>
          <td class="txt-center">-</td>
          <td class="txt-muted">${fmtDate(r.created_at)}</td>
          <td><span class="pill ${statusPill(r.status)}">${esc(statusLabel(r.status))}</span></td>
        </tr>
      `).join('');
      return `${summaryRow}${children}`;
    }).join('');
    document.querySelectorAll('.thread-chk[data-indeterminate="true"]').forEach((el) => {
      el.indeterminate = true;
    });
    updateBulk();
    renderReportDetail();
  }

  function toggleThread(key) {
    if (state.expandedThreads.has(key)) state.expandedThreads.delete(key);
    else state.expandedThreads.add(key);
    renderReports();
  }

  function toggleThreadSelection(key, checked) {
    const ids = state.reports.filter((r) => threadKeyOf(r) === key).map((r) => String(r.id));
    if (checked) ids.forEach((id) => state.selected.add(id));
    else ids.forEach((id) => state.selected.delete(id));
    renderReports();
  }

  function toggleRowSelection(id, checked) {
    const key = String(id);
    if (checked) state.selected.add(key);
    else state.selected.delete(key);
    renderReports();
  }

  function renderReportDetail() {
    const host = document.getElementById('report-detail-host');
    const r = state.reports.find((x) => x.id === state.selectedReportId);
    if (!r) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML = `
      <div class="detail-panel open" id="detail-${r.id}">
        <div class="detail-panel-header">
          <span class="detail-panel-title">#R-${r.id} — 신고 상세 검토</span>
          <button class="btn btn-sm" onclick="closeDetail(${r.id})">닫기</button>
        </div>
        <div class="detail-grid">
          <div class="detail-block"><div class="detail-block-label">신고 사유</div><div class="detail-block-value">${esc(reasonLabel(r.reason))}</div></div>
          <div class="detail-block"><div class="detail-block-label">신고자 정보</div><div class="detail-block-value">${esc(r.reporter_username || '-')} (ID: ${esc(r.reporter_id)})</div></div>
          <div class="detail-block"><div class="detail-block-label">대상 타입</div><div class="detail-block-value">${esc(reportTypeLabel(r.target_type))} #${esc(r.target_id)}</div></div>
          <div class="detail-block"><div class="detail-block-label">동일 대상 pending</div><div class="detail-block-value ${Number(r.pending_target_count || 0) >= 3 ? 'txt-danger' : ''}">${Number(r.pending_target_count || 0)}건</div></div>
        </div>
        <div class="section-title">원문 내용</div>
        <div class="original-content">${esc(r.target_content || r.description || '-')}</div>
        ${renderTargetImages(r.target_image_urls)}
        <div class="section-title">판정 메모</div>
        <textarea class="note-input" id="note-${r.id}" placeholder="판정 메모를 입력하세요"></textarea>
        <div class="malicious-row">
          <input type="checkbox" id="malicious-${r.id}">
          <label for="malicious-${r.id}">악의적 허위 신고로 판정 (false_report_warning_count +1)</label>
        </div>
        <div class="action-row">
          <button class="btn btn-green" onclick="doAction(${r.id}, 'confirm')">확정(confirm) — 정당 신고</button>
          <button class="btn btn-red" onclick="doAction(${r.id}, 'reject')">기각(reject) — 기각/복구</button>
        </div>
      </div>
    `;
  }

  function toggleDetail(id) {
    state.selectedReportId = state.selectedReportId === id ? null : id;
    renderReports();
  }

  function closeDetail() {
    state.selectedReportId = null;
    renderReports();
  }

  async function doAction(id, action) {
    const note = document.getElementById(`note-${id}`)?.value?.trim() || null;
    const malicious = !!document.getElementById(`malicious-${id}`)?.checked;
    try {
      await api(`/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: action === 'confirm' ? 'CONFIRM' : 'REJECT',
          note,
          malicious: action === 'reject' ? malicious : false,
        }),
      });
      await Promise.all([loadDashboard(), loadReports(), loadLogs()]);
      alert('처리되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  function toggleAll(chk) {
    state.selected.clear();
    if (chk.checked) {
      state.reports.forEach((r) => state.selected.add(String(r.id)));
  }
    renderReports();
  }

  function updateBulk() {
    const loadedIds = new Set(state.reports.map((r) => String(r.id)));
    const effectiveSelectedCount = [...state.selected].filter((id) => loadedIds.has(id)).length;
    document.getElementById('bulk-count').textContent = `${effectiveSelectedCount}건 선택됨`;
    document.getElementById('bulk-bar').classList.toggle('show', effectiveSelectedCount > 0);
    document.querySelectorAll('#report-tbody tr').forEach((tr) => {
      const chk = tr.querySelector('.row-chk');
      tr.classList.toggle('selected-row', chk && chk.checked);
    });
    const all = document.getElementById('chk-all');
    if (all) all.checked = state.reports.length > 0 && effectiveSelectedCount === state.reports.length;
  }

  function clearSelection() {
    state.selected.clear();
    renderReports();
  }

  async function bulkAction(action) {
    const loadedIds = new Set(state.reports.map((r) => String(r.id)));
    const ids = [...state.selected].filter((id) => loadedIds.has(id)).map((v) => Number(v));
    if (!ids.length) return;
    openBulkActionDialog(action);
  }

  function openBulkActionDialog(action) {
    state.bulkActionMode = action;
    const title = document.getElementById('bulk-action-dialog-title');
    const noteInput = document.getElementById('bulk-action-note-input');
    const maliciousRow = document.getElementById('bulk-action-malicious-row');
    const maliciousCheck = document.getElementById('bulk-action-malicious-check');
    const backdrop = document.getElementById('bulk-action-dialog-backdrop');
    if (title) {
      title.textContent = action === 'confirm' ? '일괄 확정 메모 입력' : '일괄 기각 메모 입력';
    }
    if (noteInput) noteInput.value = '';
    if (maliciousCheck) maliciousCheck.checked = false;
    if (maliciousRow) maliciousRow.style.display = action === 'reject' ? 'flex' : 'none';
    if (backdrop) backdrop.classList.add('show');
    if (noteInput) noteInput.focus();
  }

  function closeBulkActionDialog() {
    state.bulkActionMode = null;
    const backdrop = document.getElementById('bulk-action-dialog-backdrop');
    if (backdrop) backdrop.classList.remove('show');
  }

  function closeBulkActionDialogByBackdrop(event) {
    if (event.target?.id === 'bulk-action-dialog-backdrop') closeBulkActionDialog();
  }

  async function submitBulkActionDialog() {
    const action = state.bulkActionMode;
    if (!action) return;
    const loadedIds = new Set(state.reports.map((r) => String(r.id)));
    const ids = [...state.selected].filter((id) => loadedIds.has(id)).map((v) => Number(v));
    if (!ids.length) {
      alert('선택된 신고가 없습니다.');
      return;
    }
    const note = String(document.getElementById('bulk-action-note-input')?.value || '').trim();
    if (!note) {
      alert('처리 메모는 필수입니다.');
      return;
    }
    const malicious = !!document.getElementById('bulk-action-malicious-check')?.checked;
    if (!confirm(`${ids.length}건을 일괄 ${action === 'confirm' ? '확정' : '기각'} 처리할까요?`)) return;
    try {
      await api(`/reports/bulk-${action}`, {
        method: 'POST',
        body: JSON.stringify({ ids, note, malicious: action === 'reject' ? malicious : false }),
      });
      state.selected.clear();
      closeBulkActionDialog();
      await Promise.all([loadDashboard(), loadReports(), loadLogs()]);
      alert('일괄 처리되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function applyFilter() {
    await loadReports();
  }

  async function loadReports() {
    const reporter = document.getElementById('search-reporter')?.value?.trim() || '';
    const type = document.getElementById('filter-type')?.value || '';
    const reason = document.getElementById('filter-reason')?.value || '';
    const fromDate = document.getElementById('filter-from-date')?.value || '';
    const toDate = document.getElementById('filter-to-date')?.value || '';
    const q = new URLSearchParams();
    q.set('view', 'pending');
    if (reporter) q.set('reporter', reporter);
    if (type) q.set('type', type);
    if (reason) q.set('reason', reason);
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const { data } = await api(`/reports?${q.toString()}`);
    state.reports = data.reports || [];
    if (!state.reports.some((r) => r.id === state.selectedReportId)) state.selectedReportId = null;
    renderReports();
  }

  function renderProcessedReports() {
    const tbody = document.getElementById('processed-report-tbody');
    if (!state.processedReports.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="txt-muted">처리 이력이 없습니다.</td></tr>`;
      updateProcessedBulk();
      return;
    }
    const groupsMap = new Map();
    state.processedReports.forEach((r) => {
      const key = threadKeyOf(r);
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(r);
    });
    const groups = [...groupsMap.entries()].map(([key, items]) => {
      const sorted = [...items].sort((a, b) => new Date(b.reviewed_at || b.created_at) - new Date(a.reviewed_at || a.created_at));
      return { key, items: sorted, latest: sorted[0] };
    });

    tbody.innerHTML = groups.map((g) => {
      const isExpanded = state.processedExpandedThreads.has(g.key);
      const allChecked = g.items.every((r) => state.processedSelected.has(String(r.id)));
      const someChecked = g.items.some((r) => state.processedSelected.has(String(r.id)));
      const titlePrefix = isExpanded ? '▼' : '▶';
      const summaryRow = `
        <tr class="clickable" onclick="toggleProcessedThread('${esc(g.key)}')">
          <td onclick="event.stopPropagation()">
            <input type="checkbox" class="processed-thread-chk" data-thread="${esc(g.key)}" ${allChecked ? 'checked' : ''} ${!allChecked && someChecked ? 'data-indeterminate=\"true\"' : ''} onchange="toggleProcessedThreadSelection('${esc(g.key)}', this.checked)">
          </td>
          <td>${titlePrefix} #T-${esc(g.latest.target_type)}-${esc(g.latest.target_id)}</td>
          <td>${esc(g.latest.reporter_username || '-')}</td>
          <td><span class="pill ${reportTypePill(g.latest.target_type)}">${esc(reportTypeLabel(g.latest.target_type))}</span></td>
          <td>${esc(reasonLabel(g.latest.reason))}</td>
          <td class="txt-ellipsis">${esc(g.latest.target_content || g.latest.description || '-')}</td>
          <td class="txt-muted">${fmtDate(g.latest.reviewed_at || g.latest.created_at)}</td>
          <td><span class="pill ${statusPill(g.latest.status)}">${esc(statusLabel(g.latest.status))}</span></td>
          <td><button class="btn btn-sm" onclick="event.stopPropagation();reopenReport(${g.latest.id})">재오픈</button></td>
        </tr>
      `;
      if (!isExpanded) return summaryRow;
      const children = g.items.map((r) => `
        <tr>
          <td><input type="checkbox" class="processed-row-chk" ${state.processedSelected.has(String(r.id)) ? 'checked' : ''} onchange="toggleProcessedRowSelection(${r.id}, this.checked)"></td>
          <td style="padding-left:22px;">└ #R-${r.id}</td>
          <td>${esc(r.reporter_username || '-')}</td>
          <td><span class="pill ${reportTypePill(r.target_type)}">${esc(reportTypeLabel(r.target_type))}</span></td>
          <td>${esc(reasonLabel(r.reason))}</td>
          <td class="txt-ellipsis">${esc(r.target_content || r.description || '-')}</td>
          <td class="txt-muted">${fmtDate(r.reviewed_at || r.created_at)}</td>
          <td><span class="pill ${statusPill(r.status)}">${esc(statusLabel(r.status))}</span></td>
          <td><button class="btn btn-sm" onclick="reopenReport(${r.id})">재오픈</button></td>
        </tr>
      `).join('');
      return `${summaryRow}${children}`;
    }).join('');
    document.querySelectorAll('.processed-thread-chk[data-indeterminate="true"]').forEach((el) => {
      el.indeterminate = true;
    });
    updateProcessedBulk();
  }

  function toggleProcessedThread(key) {
    if (state.processedExpandedThreads.has(key)) state.processedExpandedThreads.delete(key);
    else state.processedExpandedThreads.add(key);
    renderProcessedReports();
  }

  function toggleProcessedThreadSelection(key, checked) {
    const ids = state.processedReports.filter((r) => threadKeyOf(r) === key).map((r) => String(r.id));
    if (checked) ids.forEach((id) => state.processedSelected.add(id));
    else ids.forEach((id) => state.processedSelected.delete(id));
    renderProcessedReports();
  }

  function toggleProcessedRowSelection(id, checked) {
    const key = String(id);
    if (checked) state.processedSelected.add(key);
    else state.processedSelected.delete(key);
    renderProcessedReports();
  }

  function toggleAllProcessed(chk) {
    state.processedSelected.clear();
    if (chk.checked) {
      state.processedReports.forEach((r) => state.processedSelected.add(String(r.id)));
    }
    renderProcessedReports();
  }

  function clearProcessedSelection() {
    state.processedSelected.clear();
    renderProcessedReports();
  }

  function updateProcessedBulk() {
    const loadedIds = new Set(state.processedReports.map((r) => String(r.id)));
    const effectiveSelectedCount = [...state.processedSelected].filter((id) => loadedIds.has(id)).length;
    const bar = document.getElementById('processed-bulk-bar');
    const countEl = document.getElementById('processed-bulk-count');
    if (countEl) countEl.textContent = `${effectiveSelectedCount}건 선택됨`;
    if (bar) bar.classList.toggle('show', effectiveSelectedCount > 0);
    const all = document.getElementById('processed-chk-all');
    if (all) all.checked = state.processedReports.length > 0 && effectiveSelectedCount === state.processedReports.length;
  }

  async function loadProcessedReports() {
    const reporter = document.getElementById('processed-search-reporter')?.value?.trim() || '';
    const type = document.getElementById('processed-filter-type')?.value || '';
    const status = document.getElementById('processed-filter-status')?.value || '';
    const fromDate = document.getElementById('processed-filter-from-date')?.value || '';
    const toDate = document.getElementById('processed-filter-to-date')?.value || '';
    const q = new URLSearchParams();
    q.set('view', 'processed');
    if (reporter) q.set('reporter', reporter);
    if (type) q.set('type', type);
    if (status) q.set('status', status);
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const { data } = await api(`/reports?${q.toString()}`);
    state.processedReports = data.reports || [];
    state.processedSelected.clear();
    renderProcessedReports();
  }

  function reopenReport(reportId) {
    state.reopenReportId = reportId;
    state.reopenBulkMode = false;
    const backdrop = document.getElementById('reopen-dialog-backdrop');
    const title = document.getElementById('reopen-dialog-title');
    const input = document.getElementById('reopen-note-input');
    if (title) title.textContent = `#R-${reportId} 재판정 메모 입력`;
    if (input) input.value = '';
    if (backdrop) backdrop.classList.add('show');
    if (input) input.focus();
  }

  function closeReopenDialog() {
    state.reopenReportId = null;
    state.reopenBulkMode = false;
    const backdrop = document.getElementById('reopen-dialog-backdrop');
    if (backdrop) backdrop.classList.remove('show');
  }

  function closeReopenDialogByBackdrop(event) {
    if (event.target?.id === 'reopen-dialog-backdrop') {
      closeReopenDialog();
    }
  }

  async function submitReopenDialog() {
    const reportId = state.reopenReportId;
    const loadedIds = new Set(state.processedReports.map((r) => String(r.id)));
    const selectedIds = [...state.processedSelected].filter((id) => loadedIds.has(id)).map((id) => Number(id));
    const isBulk = state.reopenBulkMode === true;
    if (!reportId && !isBulk) return;
    const input = document.getElementById('reopen-note-input');
    const trimmed = String(input?.value || '').trim();
    if (!trimmed) {
      alert('재판정 메모는 필수입니다.');
      return;
    }
    if (isBulk) {
      if (!selectedIds.length) {
        alert('선택된 신고가 없습니다.');
        return;
      }
      if (!confirm(`${selectedIds.length}건을 미처리 상태로 일괄 재오픈할까요?`)) return;
    } else {
      if (!confirm(`#R-${reportId} 신고를 미처리 상태로 되돌릴까요?`)) return;
    }
    try {
      if (isBulk) {
        await api(`/reports/bulk-reopen`, { method: 'PATCH', body: JSON.stringify({ ids: selectedIds, note: trimmed }) });
      } else {
        await api(`/reports/${reportId}/reopen`, { method: 'PATCH', body: JSON.stringify({ note: trimmed }) });
      }
      await Promise.all([loadDashboard(), loadReports(), loadProcessedReports(), loadLogs()]);
      closeReopenDialog();
      alert(isBulk ? '선택 건을 미처리 상태로 되돌렸습니다.' : '미처리 상태로 되돌렸습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  function bulkReopenProcessed() {
    const loadedIds = new Set(state.processedReports.map((r) => String(r.id)));
    const selectedCount = [...state.processedSelected].filter((id) => loadedIds.has(id)).length;
    if (!selectedCount) {
      alert('선택된 신고가 없습니다.');
      return;
    }
    state.reopenReportId = null;
    state.reopenBulkMode = true;
    const backdrop = document.getElementById('reopen-dialog-backdrop');
    const title = document.getElementById('reopen-dialog-title');
    const input = document.getElementById('reopen-note-input');
    if (title) title.textContent = `선택 ${selectedCount}건 재판정 메모 입력`;
    if (input) input.value = '';
    if (backdrop) backdrop.classList.add('show');
    if (input) input.focus();
  }
