let lastAttendanceOverview = null;
let attendanceResizeBound = false;
let attendanceTodayPage = 1;
const ATTENDANCE_TODAY_LIMIT = 50;

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

async function loadTodayAttendance(page = 1) {
  attendanceTodayPage = page;
  const hint = document.getElementById('attendance-today-hint');
  try {
    const { data } = await api(
      `/attendance/today?page=${encodeURIComponent(page)}&limit=${ATTENDANCE_TODAY_LIMIT}`,
    );
    const total = Number(data?.total || 0);
    document.getElementById('att-stat-today').textContent = String(total);
    if (hint) {
      hint.textContent = total
        ? `${data.todayYmd || '오늘'} 등교 ${total}명 · 모니터링 「오늘 등교」와 동일 집계(활성 사용자, DISTINCT)`
        : `${data?.todayYmd || '오늘'} 등교 체크한 사용자가 없습니다.`;
    }
    renderTodayCheckInUsers(data?.users || [], data?.pagination || {});
    renderTodayPagination(data?.pagination || {});
  } catch (error) {
    if (hint) hint.textContent = error?.message || '오늘 등교 목록을 불러오지 못했습니다.';
    renderTodayCheckInUsers([], {});
    renderTodayPagination({});
    throw error;
  }
}

async function loadAttendance() {
  const days = document.getElementById('attendance-days')?.value || '14';
  const maxRate = document.getElementById('attendance-max-rate')?.value || '0.25';
  const overviewHint = document.getElementById('attendance-overview-hint');

  const [overviewRes, suspiciousRes, todayRes] = await Promise.allSettled([
    api(`/attendance/overview?days=${encodeURIComponent(days)}`),
    api(
      `/attendance/suspicious?days=${encodeURIComponent(days)}&maxRate=${encodeURIComponent(maxRate)}&minAccountDays=7`,
    ),
    loadTodayAttendance(attendanceTodayPage),
  ]);

  const overview = overviewRes.status === 'fulfilled' ? (overviewRes.value.data || {}) : {};
  const suspicious = suspiciousRes.status === 'fulfilled' ? (suspiciousRes.value.data || {}) : { users: [], totalSuspicious: 0 };

  if (overviewRes.status === 'rejected') {
    console.warn('등교 overview 조회 실패:', overviewRes.reason);
    if (overviewHint) {
      overviewHint.textContent = `일별 차트를 불러오지 못했습니다: ${overviewRes.reason?.message || '오류'}`;
      overviewHint.classList.add('txt-danger');
    }
  } else if (overviewHint) {
    overviewHint.textContent = '막대 = 일별 등교 인원(중복 제외) · 회색 = 주말·공휴일';
    overviewHint.classList.remove('txt-danger');
  }

  if (suspiciousRes.status === 'rejected') {
    console.warn('등교 suspicious 조회 실패:', suspiciousRes.reason);
  }
  if (todayRes.status === 'rejected') {
    console.warn('오늘 등교 목록 조회 실패:', todayRes.reason);
  }

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
  renderSuspiciousUsers(suspicious.users || []);
}

function renderTodayPagination(pagination) {
  const pag = document.getElementById('attendance-today-pagination');
  if (!pag) return;
  const total = Number(pagination.total || 0);
  const limit = Number(pagination.limit || ATTENDANCE_TODAY_LIMIT) || ATTENDANCE_TODAY_LIMIT;
  const page = Number(pagination.page || 1) || 1;
  const maxPage = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) {
    pag.innerHTML = total
      ? `<span class="txt-muted">총 ${total}명</span>`
      : '';
    return;
  }
  pag.innerHTML = `
    <span class="txt-muted">총 ${total}명 · ${page}/${maxPage}페이지</span>
    <button class="btn btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="loadTodayAttendance(${page - 1})">이전</button>
    <button class="btn btn-sm" ${page >= maxPage ? 'disabled' : ''} onclick="loadTodayAttendance(${page + 1})">다음</button>
  `;
}

function renderTodayCheckInUsers(users, pagination) {
  const tbody = document.getElementById('attendance-today-tbody');
  if (!tbody) return;

  const total = Number(pagination?.total || 0);
  if (!users.length) {
    tbody.innerHTML = total
      ? '<tr><td colspan="5" class="txt-muted">이 페이지에 표시할 사용자가 없습니다.</td></tr>'
      : '<tr><td colspan="5" class="txt-muted">오늘 등교 체크한 사용자가 없습니다.</td></tr>';
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
      const count = Number(d.uniqueUsers ?? d.checkIns ?? 0);
      const height = Math.max(4, Math.round((count / max) * 100));
      const label = String(d.date).slice(5);
      const weekendClass = d.weekday ? '' : ' is-weekend';
      return `
        <div class="attendance-bar-col${weekendClass}" title="${esc(d.date)}: ${count}명">
          <div class="attendance-bar-value">${count || ''}</div>
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
