let lastAttendanceOverview = null;
let attendanceResizeBound = false;

function bindAttendanceChartResize() {
  if (attendanceResizeBound) return;
  attendanceResizeBound = true;
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (lastAttendanceOverview) renderAttendanceChart(lastAttendanceOverview);
    }, 150);
  });
}

async function loadAttendance() {
  const days = document.getElementById('attendance-days')?.value || '14';
  const maxRate = document.getElementById('attendance-max-rate')?.value || '0.25';

  const [overviewRes, suspiciousRes] = await Promise.allSettled([
    api(`/attendance/overview?days=${encodeURIComponent(days)}`),
    api(
      `/attendance/suspicious?days=${encodeURIComponent(days)}&maxRate=${encodeURIComponent(maxRate)}&minAccountDays=7`,
    ),
  ]);

  const overview = overviewRes.status === 'fulfilled' ? (overviewRes.value.data || {}) : {};
  const suspicious = suspiciousRes.status === 'fulfilled' ? (suspiciousRes.value.data || {}) : { users: [], totalSuspicious: 0 };

  if (overviewRes.status === 'rejected') {
    console.warn('등교 overview 조회 실패:', overviewRes.reason);
  }
  if (suspiciousRes.status === 'rejected') {
    console.warn('등교 suspicious 조회 실패:', suspiciousRes.reason);
  }

  document.getElementById('att-stat-today').textContent = String(
    overview.todayCheckIns || 0,
  );
  document.getElementById('att-stat-active').textContent = String(
    overview.activeStudents || 0,
  );
  document.getElementById('att-stat-suspicious').textContent = String(
    suspicious.totalSuspicious || 0,
  );
  document.getElementById('att-stat-rate').textContent = `${overview.attendanceRate || 0}%`;

  setNavBadge('badge-attendance-suspicious', suspicious.totalSuspicious || 0);

  lastAttendanceOverview = overview;
  bindAttendanceChartResize();
  renderAttendanceChart(overview);
  renderTodayCheckInUsers(overview.todayCheckInUsers || []);
  renderSuspiciousUsers(suspicious.users || []);
}

function renderTodayCheckInUsers(users) {
  const tbody = document.getElementById('attendance-today-tbody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="txt-muted">오늘 등교 체크한 사용자가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>#${esc(u.id)}</td>
      <td>${esc(u.username)}</td>
      <td>${esc(u.name || '-')}</td>
      <td class="txt-ellipsis">${esc(u.schoolName || '-')}</td>
      <td class="txt-muted">${esc(fmtDate(u.checkedAt))}</td>
    </tr>
  `,
    )
    .join('');
}

function renderAttendanceChart(overview) {
  const host = document.getElementById('attendance-chart');
  if (!host) return;
  const chart = overview.dailyChart || [];
  const max = overview.maxCheckIns || 1;

  if (!chart.length) {
    host.innerHTML = '<p class="txt-muted">등교 데이터가 없습니다.</p>';
    return;
  }

  host.innerHTML = chart
    .map((d) => {
      const height = Math.max(4, Math.round((d.checkIns / max) * 100));
      const label = String(d.date).slice(5);
      const weekendClass = d.weekday ? '' : ' is-weekend';
      return `
        <div class="attendance-bar-col${weekendClass}" title="${esc(d.date)}: ${d.checkIns}건">
          <div class="attendance-bar-value">${d.checkIns || ''}</div>
          <div class="attendance-bar-track">
            <div class="attendance-bar-fill" style="height:${height}%"></div>
          </div>
          <div class="attendance-bar-label">${esc(label)}</div>
        </div>
      `;
    })
    .join('');
}

function renderSuspiciousUsers(users) {
  const tbody = document.getElementById('attendance-suspicious-tbody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="txt-muted">미등교 의심 사용자가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>#${esc(u.id)}</td>
      <td>${esc(u.username)}</td>
      <td>${esc(u.name || '-')}</td>
      <td class="txt-ellipsis">${esc(u.schoolName || u.schoolId || '-')}</td>
      <td class="txt-center">${esc(u.attendanceDays)} / ${esc(u.schoolDaysInPeriod)}</td>
      <td class="txt-center ${u.attendanceRate < 15 ? 'txt-danger' : ''}">${esc(u.attendanceRate)}%</td>
      <td class="txt-muted">${esc(u.reason || '-')}</td>
      <td>
        <button class="btn btn-sm btn-amber" onclick="suspendUser(${u.id})">임시정지</button>
        <button class="btn btn-sm btn-red" onclick="banUser(${u.id})">영구정지</button>
      </td>
    </tr>
  `,
    )
    .join('');
}
