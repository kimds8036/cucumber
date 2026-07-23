async function loadDashboard() {
    const { data } = await api('/stats');
    document.getElementById('stat-today-new').textContent = String(data.todayNewReports || 0);
    document.getElementById('stat-pending-reports').textContent = String(data.pendingReports || 0);
    document.getElementById('stat-pending-appeals').textContent = String(data.pendingAppeals || 0);
    document.getElementById('stat-today-handled').textContent = String(data.todayHandledReports || 0);
    document.getElementById('stat-pending-inquiries').textContent = String(data.pendingInquiries || 0);
    document.getElementById('stat-today-answered-inquiries').textContent = String(
      data.todayAnsweredInquiries || 0,
    );
    setNavBadge('badge-reports', data.pendingReports || 0);
    setNavBadge('badge-appeals', data.pendingAppeals || 0);
    setNavBadge('badge-inquiries', data.pendingInquiries || 0);
    try {
      await loadAnalyticsOverview();
    } catch (error) {
      console.warn('[AdminDashboard] analytics overview load failed:', error?.message || error);
    }
    try {
      await loadInstallLandingStats();
    } catch (error) {
      console.warn('[AdminDashboard] install landing stats load failed:', error?.message || error);
    }
  }

  async function loadAnalyticsOverview() {
    const { data } = await api('/analytics/overview?days=14');
    window.__lastAnalyticsOverview = { data };
    renderAnalyticsKpi(data?.summary || {});
    renderAnalyticsLineChart(data?.series || []);
    renderAnalyticsHeatmap(data?.heatmapWeekly || []);
    renderAnalyticsScreenRanking(data?.screenRanking || [], data?.screenHourlyByKey || {});
  }

  async function loadInstallLandingStats() {
    const { data } = await api('/analytics/install-landing?days=14');
    window.__lastInstallLandingStats = { data };
    renderInstallLandingKpi(data?.summary || {});
    renderInstallLandingChart(data?.series || [], data?.summary || {});
  }

  function renderAnalyticsKpi(summary) {
    const latestDau = Number(summary.latestDau || 0);
    const latestMau = Number(summary.latestMauRolling30d || 0);
    const avgDau = Number(summary.avgDau || 0);
    const trend = Number(summary.dauTrendPct);
    document.getElementById('analytics-latest-dau').textContent = latestDau.toLocaleString();
    document.getElementById('analytics-latest-mau').textContent = latestMau.toLocaleString();
    document.getElementById('analytics-avg-dau').textContent = avgDau.toLocaleString();
    document.getElementById('analytics-trend').textContent = Number.isFinite(trend)
      ? `${trend > 0 ? '+' : ''}${trend}%`
      : '-';
  }

  function bindLineChartHover(svg, tooltipEl, points, buildHtml) {
    if (!svg || !tooltipEl) return;
    const wrap = svg.closest('.analytics-line-wrap');
    const hide = () => {
      tooltipEl.hidden = true;
    };
    svg.querySelectorAll('.analytics-line-hit').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const idx = Number(el.dataset.index);
        const point = points[idx];
        if (!point) return;
        tooltipEl.innerHTML = buildHtml(point, idx);
        tooltipEl.hidden = false;
        const cx = Number(el.getAttribute('cx'));
        const cy = Number(el.getAttribute('cy'));
        const vb = svg.viewBox.baseVal;
        const rect = svg.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const px = rect.left - wrapRect.left + (cx / vb.width) * rect.width;
        const py = rect.top - wrapRect.top + (cy / vb.height) * rect.height;
        tooltipEl.style.left = `${px}px`;
        tooltipEl.style.top = `${py}px`;
      });
      el.addEventListener('mouseleave', hide);
    });
    svg.addEventListener('mouseleave', hide);
  }

  function renderAnalyticsLineChart(series) {
    const svg = document.getElementById('analytics-line-chart');
    const caption = document.getElementById('analytics-line-caption');
    const tooltip = document.getElementById('analytics-line-tooltip');
    if (!svg || !caption) return;
    if (!Array.isArray(series) || series.length === 0) {
      svg.innerHTML = '';
      if (tooltip) tooltip.hidden = true;
      caption.textContent = '아직 집계 데이터가 없습니다.';
      return;
    }

    const width = 640;
    const height = 240;
    const padX = 28;
    const padTop = 16;
    const padBottom = 28;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;
    const maxValue = Math.max(
      1,
      ...series.map((s) => Number(s.dauCount || 0)),
      ...series.map((s) => Number(s.mauRolling30dCount || 0)),
    );
    const x = (i) => padX + (chartW * i) / Math.max(1, series.length - 1);
    const y = (v) => padTop + chartH - (chartH * Number(v || 0)) / maxValue;

    const dauPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.dauCount)}`).join(' ');
    const mauPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.mauRolling30dCount)}`).join(' ');

    const grid = [0.25, 0.5, 0.75, 1].map((ratio) => {
      const gy = padTop + chartH - chartH * ratio;
      return `<line x1="${padX}" y1="${gy}" x2="${padX + chartW}" y2="${gy}" stroke="#e7e5e4" stroke-width="1" />`;
    }).join('');

    const hitCircles = series.map((s, i) => {
      const cx = x(i);
      const cyDau = y(s.dauCount);
      const cyMau = y(s.mauRolling30dCount);
      const cyHit = (cyDau + cyMau) / 2;
      return `
        <circle class="analytics-line-dot" cx="${cx}" cy="${cyDau}" r="3" fill="#16a34a" />
        <circle class="analytics-line-dot" cx="${cx}" cy="${cyMau}" r="3" fill="#2563eb" />
        <circle class="analytics-line-hit" data-index="${i}" cx="${cx}" cy="${cyHit}" r="14" fill="transparent" />
      `;
    }).join('');

    svg.innerHTML = `
      ${grid}
      <path d="${mauPath}" fill="none" stroke="#2563eb" stroke-width="2.2" />
      <path d="${dauPath}" fill="none" stroke="#16a34a" stroke-width="2.2" />
      ${hitCircles}
    `;

    bindLineChartHover(svg, tooltip, series, (point) => `
      <div><strong>${esc(point.date)}</strong></div>
      <div>DAU: ${Number(point.dauCount || 0).toLocaleString()}</div>
      <div>MAU: ${Number(point.mauRolling30dCount || 0).toLocaleString()}</div>
    `);

    const first = series[0];
    const last = series[series.length - 1];
    caption.textContent = `${first.date} ~ ${last.date} · 포인트에 마우스를 올리면 수치를 볼 수 있습니다.`;
  }

  function renderInstallLandingKpi(summary) {
    const elHits = document.getElementById('install-today-hits');
    if (!elHits) return;
    document.getElementById('install-today-hits').textContent = Number(summary.todayHits || 0).toLocaleString();
    document.getElementById('install-today-unique').textContent = summary.uniqueAvailable
      ? Number(summary.todayUnique || 0).toLocaleString()
      : '-';
    document.getElementById('install-range-hits').textContent = Number(summary.rangeHits || 0).toLocaleString();
    document.getElementById('install-today-platform').textContent =
      `${Number(summary.todayIos || 0)} / ${Number(summary.todayAndroid || 0)} / ${Number(summary.todayOther || 0)}`;
  }

  function renderInstallLandingChart(series, summary) {
    const svg = document.getElementById('install-landing-chart');
    const caption = document.getElementById('install-landing-caption');
    const tooltip = document.getElementById('install-landing-tooltip');
    if (!svg || !caption) return;
    if (!Array.isArray(series) || series.length === 0) {
      svg.innerHTML = '';
      if (tooltip) tooltip.hidden = true;
      caption.textContent = '아직 /get 방문 데이터가 없습니다. 링크가 눌리면 여기에 쌓입니다.';
      return;
    }

    const width = 640;
    const height = 240;
    const padX = 28;
    const padTop = 16;
    const padBottom = 28;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;
    const maxValue = Math.max(
      1,
      ...series.map((s) => Number(s.hits || 0)),
      ...series.map((s) => Number(s.uniqueVisitors || 0)),
    );
    const x = (i) => padX + (chartW * i) / Math.max(1, series.length - 1);
    const y = (v) => padTop + chartH - (chartH * Number(v || 0)) / maxValue;

    const hitsPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.hits)}`).join(' ');
    const uvPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.uniqueVisitors)}`).join(' ');
    const grid = [0.25, 0.5, 0.75, 1].map((ratio) => {
      const gy = padTop + chartH - chartH * ratio;
      return `<line x1="${padX}" y1="${gy}" x2="${padX + chartW}" y2="${gy}" stroke="#e7e5e4" stroke-width="1" />`;
    }).join('');
    const hitCircles = series.map((s, i) => {
      const cx = x(i);
      const cy = y(s.hits);
      return `
        <circle cx="${cx}" cy="${cy}" r="3" fill="#7c3aed" />
        <circle cx="${cx}" cy="${y(s.uniqueVisitors)}" r="3" fill="#ea580c" />
        <circle class="analytics-line-hit" data-index="${i}" cx="${cx}" cy="${cy}" r="14" fill="transparent" />
      `;
    }).join('');

    svg.innerHTML = `
      ${grid}
      <path d="${hitsPath}" fill="none" stroke="#7c3aed" stroke-width="2.2" />
      <path d="${uvPath}" fill="none" stroke="#ea580c" stroke-width="2.2" />
      ${hitCircles}
    `;

    bindLineChartHover(svg, tooltip, series, (point) => `
      <div><strong>${esc(point.date)}</strong></div>
      <div>방문: ${Number(point.hits || 0).toLocaleString()}회</div>
      <div>UV: ${Number(point.uniqueVisitors || 0).toLocaleString()}</div>
      <div>iOS ${Number(point.ios || 0)} · Android ${Number(point.android || 0)} · 기타 ${Number(point.other || 0)}</div>
    `);

    const first = series[0];
    const last = series[series.length - 1];
    const uvNote = summary.uniqueAvailable
      ? 'UV는 Redis HyperLogLog 근사치입니다.'
      : 'UV는 Redis 미설정으로 표시되지 않습니다.';
    caption.textContent = `${first.date} ~ ${last.date} · ${uvNote}`;
  }

  function renderAnalyticsHeatmap(heatmapWeekly) {
    const wrap = document.getElementById('analytics-heatmap');
    if (!wrap) return;
    const slots = Array.isArray(heatmapWeekly) ? heatmapWeekly : [];
    const normalized = new Array(7 * 24).fill(0).map((_, i) => Number(slots[i] || 0));
    const max = Math.max(1, ...normalized);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    wrap.innerHTML = '';

    for (let dow = 0; dow < 7; dow += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const idx = dow * 24 + hour;
        const value = normalized[idx];
        const level = value / max;
        const color = level <= 0.02
          ? '#eceae6'
          : level < 0.25
            ? '#fde7bf'
            : level < 0.5
              ? '#f5c87d'
              : level < 0.75
                ? '#ef7c4b'
                : '#d7443e';
        const cell = document.createElement('div');
        cell.className = 'analytics-heat-cell';
        cell.style.background = color;
        cell.dataset.tip = `${days[dow]}요일 ${String(hour).padStart(2, '0')}시: ${value.toLocaleString()}회`;
        wrap.appendChild(cell);
      }
    }
  }

  let analyticsSelectedScreenKey = null;

  function renderAnalyticsScreenRanking(screenRanking, screenHourlyByKey) {
    const barsWrap = document.getElementById('analytics-screen-bars');
    const caption = document.getElementById('analytics-screen-caption');
    const toolbar = document.getElementById('analytics-screen-hour-toolbar');
    if (!barsWrap || !caption || !toolbar) return;

    const rows = Array.isArray(screenRanking) ? screenRanking : [];
    if (!rows.length) {
      barsWrap.innerHTML = '<div class="txt-muted" style="font-size:12px;padding:8px 0;">아직 화면별 집계 데이터가 없습니다.</div>';
      caption.textContent = '앱에서 화면 진입 이벤트가 수집되면 표시됩니다.';
      toolbar.innerHTML = '';
      renderAnalyticsScreenHourChart(null, []);
      return;
    }

    const maxViews = Math.max(1, ...rows.map((row) => Number(row.views || 0)));
    barsWrap.innerHTML = rows.map((row) => {
      const views = Number(row.views || 0);
      const widthPct = Math.max(2, (views / maxViews) * 100);
      return `
        <div class="analytics-screen-bar-row" data-screen-key="${esc(row.key)}">
          <div class="analytics-screen-bar-label" title="${esc(row.label || row.key)}">${esc(row.label || row.key)}</div>
          <div class="analytics-screen-bar-track">
            <div class="analytics-screen-bar-fill" style="width:${widthPct.toFixed(1)}%"></div>
          </div>
          <div class="analytics-screen-bar-value">${views.toLocaleString()}</div>
        </div>
      `;
    }).join('');

    const totalViews = rows.reduce((sum, row) => sum + Number(row.views || 0), 0);
    caption.textContent = `최근 집계 구간 합계 ${totalViews.toLocaleString()}회 · 상위 ${rows.length}개 화면`;

    if (!analyticsSelectedScreenKey || !screenHourlyByKey?.[analyticsSelectedScreenKey]) {
      analyticsSelectedScreenKey = rows[0].key;
    }

    toolbar.innerHTML = rows.slice(0, 8).map((row) => `
      <button
        type="button"
        class="analytics-screen-hour-btn ${row.key === analyticsSelectedScreenKey ? 'is-active' : ''}"
        data-screen-key="${esc(row.key)}"
        onclick="selectAnalyticsScreenHour('${esc(row.key)}')"
      >${esc(row.label || row.key)}</button>
    `).join('');

    renderAnalyticsScreenHourChart(
      analyticsSelectedScreenKey,
      screenHourlyByKey?.[analyticsSelectedScreenKey] || rows.find((r) => r.key === analyticsSelectedScreenKey)?.hours || [],
      rows.find((r) => r.key === analyticsSelectedScreenKey)?.label,
    );
  }

  window.selectAnalyticsScreenHour = function selectAnalyticsScreenHour(screenKey) {
    analyticsSelectedScreenKey = screenKey;
    const toolbar = document.getElementById('analytics-screen-hour-toolbar');
    toolbar?.querySelectorAll('.analytics-screen-hour-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.screenKey === screenKey);
    });
    const { data } = window.__lastAnalyticsOverview || {};
    const hours = data?.screenHourlyByKey?.[screenKey] || [];
    const label = (data?.screenRanking || []).find((row) => row.key === screenKey)?.label;
    renderAnalyticsScreenHourChart(screenKey, hours, label);
  };

  function renderAnalyticsScreenHourChart(screenKey, hours, label) {
    const chart = document.getElementById('analytics-screen-hour-chart');
    const caption = document.getElementById('analytics-screen-hour-caption');
    if (!chart || !caption) return;

    const values = Array.isArray(hours) ? hours.map((v) => Number(v || 0)) : new Array(24).fill(0);
    const max = Math.max(1, ...values);
    chart.innerHTML = values.map((value, hour) => {
      const heightPct = Math.max(2, (value / max) * 100);
      return `
        <div class="analytics-screen-hour-col" title="${String(hour).padStart(2, '0')}시: ${value.toLocaleString()}회">
          <div class="analytics-screen-hour-bar" style="height:${heightPct.toFixed(1)}%"></div>
          <div class="analytics-screen-hour-label">${hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}</div>
        </div>
      `;
    }).join('');

    if (!screenKey) {
      caption.textContent = '화면을 선택하면 시간대별 조회 분포를 보여줍니다.';
      return;
    }
    const total = values.reduce((sum, v) => sum + v, 0);
    caption.textContent = `${label || screenKey} · 24시간 합계 ${total.toLocaleString()}회`;
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
