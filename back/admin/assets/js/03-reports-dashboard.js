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
  }

  async function loadOpsPanel() {
    bindOpsHub();
    showOpsHub();
  }

  function showOpsHub() {
    const hub = document.getElementById('ops-hub');
    if (hub) hub.hidden = false;
    document.querySelectorAll('.ops-view').forEach((el) => {
      el.hidden = true;
    });
    const meta = PAGE_META.ops;
    const title = document.getElementById('topbar-title');
    const sub = document.getElementById('topbar-sub');
    if (title) title.textContent = meta.title;
    if (sub) sub.textContent = meta.sub;
  }

  function bindOpsHub() {
    const hub = document.getElementById('ops-hub');
    if (!hub || hub.dataset.bound === '1') return;
    hub.dataset.bound = '1';
    hub.addEventListener('click', (e) => {
      const card = e.target.closest('[data-ops-view]');
      if (!card) return;
      openOpsView(card.getAttribute('data-ops-view'));
    });
    document.getElementById('panel-ops')?.addEventListener('click', (e) => {
      if (!e.target.closest('[data-ops-back]')) return;
      showOpsHub();
    });
    bindOpsUserInspect();
  }

  async function openOpsView(view) {
    const hub = document.getElementById('ops-hub');
    if (hub) hub.hidden = true;
    document.querySelectorAll('.ops-view').forEach((el) => {
      el.hidden = el.id !== `ops-view-${view}`;
    });
    const titles = {
      user: ['사용자', '배지 · 시간표 · 친구'],
      timer: ['타이머', '공부 시간 · 세션'],
      activity: ['앱 활동', '글 · 댓글 · 쪽지 · 우편'],
      jobs: ['크론', '무슨 일이 도는지 · 최근 실행'],
      terms: ['등교 · 학기', '개학일 · 오늘 등교 여부'],
      reach: ['이용 · 설치', 'DAU/MAU · /get'],
    };
    const t = titles[view];
    if (t) {
      const title = document.getElementById('topbar-title');
      const sub = document.getElementById('topbar-sub');
      if (title) title.textContent = t[0];
      if (sub) sub.textContent = t[1];
    }
    try {
      if (view === 'jobs') {
        renderCronCatalog(OPS_CRON_FALLBACK);
        await loadBatchJobsOverview();
      }
      if (view === 'timer') await loadTimerOps();
      if (view === 'activity') await loadActivityOps();
      if (view === 'terms') await loadOpsSchoolTerms();
      if (view === 'reach') {
        await loadAnalyticsOverview();
        await loadInstallLandingStats();
      }
    } catch (error) {
      alert(error?.message || '모니터링 데이터를 불러오지 못했습니다.');
    }
  }

  window.showOpsHub = showOpsHub;

  async function loadOpsSchoolTerms() {
    const { data } = await api('/analytics/school-terms');
    const w = data?.window || {};
    const s = data?.summary || {};
    const kpis = document.getElementById('ops-terms-kpis');
    if (kpis) {
      kpis.innerHTML = `
        <div class="stat-card"><div class="stat-num">${esc(data?.todayYmd || '-')}</div><div class="stat-label">오늘 (KST)</div></div>
        <div class="stat-card ${w.ok ? 'stat-ok' : 'stat-warn'}"><div class="stat-num" style="font-size:16px">${esc(w.ok ? '시간대 안' : (w.reasonLabel || '-'))}</div><div class="stat-label">${esc(w.start || '07:00')}~${esc(w.end || '10:00')}</div></div>
        <div class="stat-card"><div class="stat-num">${Number(s.schools || 0)}</div><div class="stat-label">가입 학교</div></div>
        <div class="stat-card stat-ok"><div class="stat-num">${Number(s.inSessionToday || 0)}</div><div class="stat-label">오늘 학기 중</div></div>
        <div class="stat-card"><div class="stat-num">${Number(s.schoolDayToday || 0)}</div><div class="stat-label">오늘 등교일</div></div>
        <div class="stat-card stat-warn"><div class="stat-num">${Number(s.missingTerms || 0)}</div><div class="stat-label">학기 미적재</div></div>
      `;
    }
    const hint = document.getElementById('ops-terms-window-hint');
    if (hint) {
      hint.textContent = w.ok
        ? '지금은 등교 시간대입니다. 학교별 등교일이면 체크인이 가능합니다.'
        : `지금은 체크인 시간이 아닙니다. (${w.reasonLabel || '-'}) 학기·등교일 판정은 아래 표를 보세요.`;
    }
    const tbody = document.getElementById('ops-terms-tbody');
    if (!tbody) return;
    const schools = data?.schools || [];
    if (!schools.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-row">가입자가 있는 학교가 없습니다.</td></tr>';
      return;
    }
    const rows = [];
    for (const sch of schools) {
      const today = sch.today || {};
      const terms = sch.terms || [];
      if (!terms.length) {
        rows.push(`
          <tr>
            <td>${esc(sch.schoolName)}</td>
            <td>${Number(sch.userCount || 0)}</td>
            <td colspan="4" class="txt-muted">학기 행 없음</td>
            <td>-</td>
            <td>${today.schoolDay ? '가능' : '불가'}</td>
            <td>${today.checkInPossibleNow ? '가능' : '불가'}</td>
            <td>${esc(today.reasonLabel || '-')}</td>
          </tr>
        `);
        continue;
      }
      terms.forEach((t, i) => {
        rows.push(`
          <tr>
            <td>${i === 0 ? esc(sch.schoolName) : ''}</td>
            <td>${i === 0 ? Number(sch.userCount || 0) : ''}</td>
            <td>${esc(t.academicYear ?? '-')}</td>
            <td>${esc(t.semester ?? '-')}</td>
            <td>${esc(t.openYmd || '-')}</td>
            <td>${esc(t.closeYmd || '-')}</td>
            <td>${t.inSessionToday ? '학기 중' : '-'}</td>
            <td>${i === 0 ? (today.schoolDay ? '등교일' : '아님') : ''}</td>
            <td>${i === 0 ? (today.checkInPossibleNow ? '가능' : '불가') : ''}</td>
            <td>${i === 0 ? esc(today.reasonLabel || '-') : ''}</td>
          </tr>
        `);
      });
    }
    tbody.innerHTML = rows.join('');
  }

  function bindOpsUserInspect() {
    const btn = document.getElementById('ops-user-search-btn');
    const input = document.getElementById('ops-user-q');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    const run = () => loadOpsUserInspect();
    btn.addEventListener('click', run);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          run();
        }
      });
    }
  }

  async function loadOpsUserInspect() {
    const input = document.getElementById('ops-user-q');
    const empty = document.getElementById('ops-user-inspect-empty');
    const wrap = document.getElementById('ops-user-inspect-wrap');
    const q = String(input?.value || '').trim();
    if (!q) {
      if (empty) empty.textContent = '아이디 또는 사용자 번호를 입력하세요.';
      if (wrap) wrap.hidden = true;
      return;
    }
    try {
      const { data } = await api(`/analytics/user-inspect?q=${encodeURIComponent(q)}`);
      if (empty) empty.hidden = true;
      if (wrap) wrap.hidden = false;
      renderOpsUserInspect(data);
    } catch (error) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = error?.message || '조회에 실패했습니다.';
      }
      if (wrap) wrap.hidden = true;
    }
  }

  function renderOpsUserInspect(data) {
    const u = data?.user || {};
    const s = data?.stats || {};
    const badges = data?.badges || {};
    const kpis = document.getElementById('ops-user-kpis');
    if (kpis) {
      const who = `${u.displayName ? `${u.displayName} ` : ''}@${u.username || '-'} (#${u.id || '-'})`;
      const school = `${u.schoolName || '-'}${u.grade != null ? ` ${u.grade}학년` : ''}${u.classNumber != null ? ` ${u.classNumber}반` : ''}`;
      kpis.innerHTML = `
        <div class="stat-card"><div class="stat-num" style="font-size:14px;line-height:1.3">${esc(who)}</div><div class="stat-label">${esc(school)}</div></div>
        <div class="stat-card"><div class="stat-num">${Number(s.friendCount || 0).toLocaleString()}</div><div class="stat-label">친구 수</div></div>
        <div class="stat-card stat-ok"><div class="stat-num">${Number(badges.ownedCount || 0)}</div><div class="stat-label">획득 배지</div></div>
        <div class="stat-card stat-warn"><div class="stat-num">${Number(badges.lockedCount || 0)}</div><div class="stat-label">미오픈 배지</div></div>
        <div class="stat-card"><div class="stat-num">${Number(s.postCount || 0).toLocaleString()}</div><div class="stat-label">글</div></div>
        <div class="stat-card"><div class="stat-num">${Number(s.commentCount || 0).toLocaleString()}</div><div class="stat-label">댓글</div></div>
        <div class="stat-card ${s.todayCheckedIn ? 'stat-ok' : ''}"><div class="stat-num">${s.todayCheckedIn ? '완료' : '미체크'}</div><div class="stat-label">오늘 등교</div></div>
        <div class="stat-card"><div class="stat-num">${Number(s.attendancePresentCount || 0)}</div><div class="stat-label">최근 2달 등교</div></div>
      `;
    }
    const tbody = document.getElementById('ops-user-badges-tbody');
    if (tbody) {
      const items = badges.items || [];
      tbody.innerHTML = items.map((b) => {
        const p = b.progress || {};
        const current = Number(p.current || 0);
        const target = Number(p.target || 0);
        const ratio = target > 0 ? `${current}/${target}` : '-';
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        const st = b.owned ? (b.equipped ? '장착' : '획득') : '미오픈';
        return `
          <tr>
            <td>${esc(st)}</td>
            <td>${esc(b.title || b.key)}</td>
            <td>${esc(ratio)} (${pct}%)</td>
            <td>${esc(b.description || '')}</td>
          </tr>
        `;
      }).join('');
    }
    const hint = document.getElementById('ops-user-tt-hint');
    const ttWrap = document.getElementById('ops-user-tt-wrap');
    const tt = data?.timetable || {};
    const src = tt.source || {};
    if (hint) {
      hint.textContent = src.neis || src.override
        ? `NEIS ${src.neis ? '있음' : '없음'} · 수정본 ${src.override ? '있음' : '없음'}${tt.overrideUpdatedAt ? ` · 수정 ${tt.overrideUpdatedAt}` : ''}`
        : '등록된 시간표가 없습니다.';
    }
    if (ttWrap) {
      if (!tt.rows || !tt.rows.length) {
        ttWrap.innerHTML = '<p class="txt-muted" style="font-size:13px">표시할 교시가 없습니다.</p>';
      } else {
        const days = tt.days || [];
        ttWrap.innerHTML = `<table>
          <thead><tr><th style="width:56px">교시</th>${days.map((d) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
          <tbody>
            ${tt.rows.map((r) => `<tr><td>${r.period}</td>${(r.cells || []).map((c) => `<td>${esc(c || '')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>`;
      }
    }
    renderOpsUserAttendance(data?.attendance);
  }

  function renderOpsUserAttendance(att) {
    const host = document.getElementById('ops-user-att-cals');
    const hint = document.getElementById('ops-user-att-hint');
    if (!host) return;
    const months = att?.months || [];
    if (hint) {
      hint.textContent = att?.todayCheckedIn
        ? `오늘(${att.todayYmd}) 등교 완료 · 초록=체크인, 테두리=등교일 미체크, 흐림=주말·방학·휴업`
        : `오늘(${att?.todayYmd || '-'}) 미체크 · 초록=체크인, 테두리=등교일 미체크, 흐림=주말·방학·휴업`;
    }
    if (!months.length) {
      host.innerHTML = '<p class="txt-muted" style="font-size:13px">등교 기록이 없습니다.</p>';
      return;
    }
    const dow = ['일', '월', '화', '수', '목', '금', '토'];
    host.innerHTML = `<div class="ops-att-months">${months.map((m) => `
      <div class="ops-att-cal">
        <div class="ops-att-cal-title">${esc(m.label)}</div>
        <div class="ops-att-grid">
          ${dow.map((d) => `<div class="ops-att-dow">${d}</div>`).join('')}
          ${(m.weeks || []).flat().map((c) => {
            if (!c.inMonth) return '<div class="ops-att-cell is-empty"></div>';
            const cls = [
              'ops-att-cell',
              c.present ? 'is-present' : '',
              !c.present && c.schoolDay ? 'is-missed' : '',
              !c.schoolDay ? 'is-off' : '',
              c.isToday ? 'is-today' : '',
            ].filter(Boolean).join(' ');
            const title = `${c.ymd}${c.present ? ' 등교' : (c.schoolDay ? ' 미체크' : ` ${c.reason || '휴일'}`)}`;
            return `<div class="${cls}" title="${esc(title)}">${c.day}</div>`;
          }).join('')}
        </div>
      </div>
    `).join('')}</div>`;
  }

  function formatBatchSummary(row) {
    const raw = row.summary_json;
    let obj = raw;
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw); } catch { obj = null; }
    }
    if (obj && typeof obj === 'object') {
      return Object.entries(obj)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}=${v}`)
        .join(' · ') || '-';
    }
    return row.error_message || '-';
  }

  async function loadBatchJobsOverview() {
    renderCronCatalog(OPS_CRON_FALLBACK);
    let data = {};
    try {
      const res = await api('/batch-jobs?limit=30');
      data = res?.data || {};
    } catch (error) {
      console.warn('[Ops] batch-jobs', error?.message || error);
    }
    const catalog = data?.catalog || {};
    const hint = document.getElementById('ops-cron-catalog-hint');
    if (hint) {
      hint.textContent = catalog.enabledHint
        ? `${catalog.enabledHint} (시간대 ${catalog.timezone || 'Asia/Seoul'})`
        : '서버가 한국 시간으로 알아서 돌리는 일들입니다.';
    }
    renderCronCatalog(catalog.jobs?.length ? catalog.jobs : OPS_CRON_FALLBACK);
    const jobsMeta = catalog.jobs?.length ? catalog.jobs : OPS_CRON_FALLBACK;
    const runsBody = document.getElementById('ops-batch-runs-tbody');
    const cursorsBody = document.getElementById('ops-batch-cursors-tbody');
    const runs = data?.runs || [];
    const cursors = data?.cursors || [];
    const titleOf = (name) => {
      const hit = jobsMeta.find((j) => j.key === name);
      return hit ? `${hit.emoji} ${hit.title}` : name;
    };
    if (runsBody) {
      if (!runs.length) {
        runsBody.innerHTML = '<tr><td colspan="5" class="empty-row">아직 실행 기록이 없어요. 스케줄러가 한 번 돌면 쌓입니다.</td></tr>';
      } else {
        runsBody.innerHTML = runs.map((r) => `
          <tr>
            <td>${esc(titleOf(r.job_name))}</td>
            <td>${esc(cronStatusKo(r.status))}</td>
            <td>${Number(r.elapsed_ms || 0)}</td>
            <td>${esc(formatBatchSummary(r))}</td>
            <td>${esc(fmtDate(r.finished_at))}</td>
          </tr>
        `).join('');
      }
    }
    if (cursorsBody) {
      if (!cursors.length) {
        cursorsBody.innerHTML = '<tr><td colspan="4" class="empty-row">아직 없어요. 학교 통계가 한 번 돌면 생겨요.</td></tr>';
      } else {
        cursorsBody.innerHTML = cursors.map((c) => `
          <tr>
            <td>${esc(titleOf(c.job_name))}</td>
            <td>${esc(c.cursor_key)}</td>
            <td>${esc(c.mode || '-')}</td>
            <td>id=${c.last_id ?? '-'} · at=${esc(c.last_at || '-')} · ${esc(c.note || '')}</td>
          </tr>
        `).join('');
      }
    }
  }

  function cronStatusKo(status) {
    if (status === 'success') return '잘됨';
    if (status === 'failed') return '실패';
    if (status === 'skipped') return '건너뜀';
    return status || '-';
  }

  const OPS_CRON_FALLBACK = [
    { key: 'study-grass-aggregate', emoji: '🌱', title: '공부 잔디', when: '매시 5분', blurb: '오늘 학교에서 누가 얼마나 공부했는지 모아서 잔디·순위에 넣어요.' },
    { key: 'trending-settle', emoji: '🔥', title: '인기글 정리', when: '10분마다', blurb: '요즘 뜨는 글·해시태그 순서를 다시 매겨요.' },
    { key: 'school-stats', emoji: '🏫', title: '학교 통계', when: '매시 정각', blurb: '글 댓글 수를 맞춰요. 평소엔 새로 생긴 것만, 가끔 전체를 다시 세어요.' },
    { key: 'timer-session-guard', emoji: '⏱️', title: '타이머 지킴이', when: '10분마다', blurb: '너무 오래 켜진 공부 타이머를 정리해서 시간이 이상하게 안 쌓이게 해요.' },
    { key: 'personal-mail-return', emoji: '✉️', title: '개인 우편 반송', when: '30분마다', blurb: '받을 수 없는 개인 우편을 돌려보내요.' },
    { key: 'reverification-guide', emoji: '🪪', title: '재인증 안내', when: '2말~3초 새벽 4시', blurb: '학년도가 바뀔 때 학생증 다시 올리라고 알려 줘요. 그 시기만 돌아요.' },
    { key: 'admin-stats-reconcile', emoji: '📊', title: '관리자 숫자 맞춤', when: '5분마다', blurb: '대시보드에 찍히는 신고·문의 건수가 실제랑 안 어긋나게 맞춰요.' },
    { key: 'attendance-suspicion', emoji: '🎒', title: '미등교 의심', when: '매일 새벽 3시', blurb: '등교 체크가 거의 없는 학생을 골라 관리자 등교 현황에 올려요.' },
    { key: 'admin-retention', emoji: '🧹', title: '오래된 기록 정리', when: '일요일 새벽 5시', blurb: '너무 오래된 운영 로그를 지워서 DB가 불어나지 않게 해요.' },
    { key: 'analytics-reconcile', emoji: '📈', title: '이용 지표 맞춤', when: '매일 새벽 4시', blurb: 'DAU/MAU 같은 이용 숫자가 Redis·DB에서 빠지지 않게 다시 맞춰요.' },
    { key: 'school-terms-sync', emoji: '📅', title: '학기·개학 동기화', when: '월요일 새벽 4시', blurb: 'NEIS에서 개학·방학을 가져와 등교 가능 날을 판단할 수 있게 해요.' },
  ];

  function renderCronCatalog(jobs) {
    const host = document.getElementById('ops-cron-catalog');
    if (!host) return;
    if (!jobs.length) {
      host.innerHTML = '<p class="txt-muted">목록을 불러오지 못했어요.</p>';
      return;
    }
    host.innerHTML = jobs.map((j) => {
      const last = j.lastRun;
      let badge = '아직 기록 없음';
      let tone = 'idle';
      if (last?.status === 'success') {
        badge = '최근에 잘됨';
        tone = 'ok';
      } else if (last?.status === 'failed') {
        badge = '최근에 실패';
        tone = 'bad';
      } else if (last?.status === 'skipped') {
        badge = '최근에 건너뜀';
        tone = 'skip';
      }
      const whenLast = last?.finished_at ? fmtDate(last.finished_at) : '-';
      return `
        <article class="ops-cron-card tone-${tone}">
          <div class="ops-cron-emoji" aria-hidden="true">${esc(j.emoji || '✨')}</div>
          <div class="ops-cron-body">
            <div class="ops-cron-top">
              <h3 class="ops-cron-title">${esc(j.title)}</h3>
              <span class="ops-cron-badge">${esc(badge)}</span>
            </div>
            <p class="ops-cron-when">⏰ ${esc(j.when)}</p>
            <p class="ops-cron-blurb">${esc(j.blurb)}</p>
            <p class="ops-cron-last">마지막: ${esc(whenLast)}${last?.elapsed_ms != null ? ` · ${Number(last.elapsed_ms)}ms` : ''}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadTimerOps() {
    const { data } = await api('/analytics/timer?days=14');
    renderTimerKpi(data?.summary || {});
    renderTimerLineChart(data?.series || []);
    renderTimerSchoolBars(data?.topSchools || []);
    renderTimerSessions(data?.recentSessions || []);
  }

  function renderTimerKpi(summary) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set('timer-today-users', Number(summary.todayActiveUsers || 0).toLocaleString());
    set('timer-today-hours', Number(summary.todayTotalHours || 0).toLocaleString());
    set('timer-today-avg', Number(summary.todayAvgHoursPerUser || 0).toLocaleString());
    set('timer-open-users', Number(summary.openUsers || 0).toLocaleString());
    set('timer-range-users', Number(summary.rangeActiveUsers || 0).toLocaleString());
    set('timer-range-hours', Number(summary.rangeTotalHours || 0).toLocaleString());
  }

  function renderTimerLineChart(series) {
    const svg = document.getElementById('timer-line-chart');
    const caption = document.getElementById('timer-line-caption');
    const tooltip = document.getElementById('timer-line-tooltip');
    if (!svg || !caption) return;
    if (!Array.isArray(series) || series.length === 0) {
      svg.innerHTML = '';
      if (tooltip) tooltip.hidden = true;
      caption.textContent = '아직 타이머 집계가 없습니다.';
      return;
    }
    svg.setAttribute('viewBox', '0 0 640 260');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = buildLineChartSvg({
      series,
      seriesA: (s) => Number(s.activeUsers || 0),
      seriesB: (s) => Number(s.totalHours || 0),
      colorA: '#7c3aed',
      colorB: '#0f766e',
      formatTick: (s) => String(s.date || '').slice(5),
    });
    bindLineChartHover(svg, tooltip, series, (point) => `
      <div><strong>${esc(point.date)}</strong></div>
      <div>이용 학생: ${Number(point.activeUsers || 0).toLocaleString()}명</div>
      <div>총 시간: ${Number(point.totalHours || 0).toLocaleString()}h</div>
      <div>1인 평균: ${Number(point.avgHoursPerUser || 0).toLocaleString()}h</div>
    `);
    const first = series[0];
    const last = series[series.length - 1];
    caption.textContent = `${first.date} ~ ${last.date} · 학생 수와 총 공부 시간(시간)`;
  }

  function renderTimerSchoolBars(rows) {
    const barsWrap = document.getElementById('timer-school-bars');
    const caption = document.getElementById('timer-school-caption');
    if (!barsWrap || !caption) return;
    if (!Array.isArray(rows) || !rows.length) {
      barsWrap.innerHTML = '<div class="txt-muted" style="font-size:12px;padding:8px 0;">학교별 집계가 없습니다.</div>';
      caption.textContent = '타이머를 쓴 학교가 생기면 표시됩니다.';
      return;
    }
    const maxHours = Math.max(1, ...rows.map((row) => Number(row.totalHours || 0)));
    barsWrap.innerHTML = rows.map((row) => {
      const hours = Number(row.totalHours || 0);
      const widthPct = Math.max(2, (hours / maxHours) * 100);
      const users = Number(row.activeUsers || 0);
      return `
        <div class="analytics-screen-bar-row">
          <div class="analytics-screen-bar-label" title="${esc(row.schoolName)}">${esc(row.schoolName)}</div>
          <div class="analytics-screen-bar-track">
            <div class="analytics-screen-bar-fill" style="width:${widthPct.toFixed(1)}%"></div>
          </div>
          <div class="analytics-screen-bar-value">${hours.toLocaleString()}h · ${users.toLocaleString()}명</div>
        </div>
      `;
    }).join('');
    caption.textContent = `기간 합계 상위 ${rows.length}개 학교 · 시간은 합계, 인원은 해당 학교 이용 학생 수`;
  }

  function formatOpsStudent(row) {
    const name = row.displayName ? `${row.displayName} ` : '';
    const grade =
      row.grade != null ? ` ${row.grade}학년${row.classNumber != null ? ` ${row.classNumber}반` : ''}` : '';
    return `${name}@${row.username || '-'} (#${row.userId || '-'})${grade}`;
  }

  function sessionDayKey(startedAt) {
    if (!startedAt) return 'unknown';
    const d = new Date(startedAt);
    if (Number.isNaN(d.getTime())) return String(startedAt).slice(0, 10) || 'unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function groupTimerSessions(rows) {
    const byDay = new Map();
    for (const r of rows) {
      const day = sessionDayKey(r.startedAt);
      if (!byDay.has(day)) byDay.set(day, new Map());
      const users = byDay.get(day);
      const uid = Number(r.userId) || 0;
      if (!users.has(uid)) {
        users.set(uid, {
          userId: uid,
          label: formatOpsStudent(r),
          schoolName: r.schoolName || '-',
          sessions: [],
          hours: 0,
          open: false,
        });
      }
      const g = users.get(uid);
      g.sessions.push(r);
      g.hours += Number(r.hours || 0);
      if (r.open) g.open = true;
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, users]) => ({
        date,
        users: [...users.values()].sort((a, b) => {
          if (a.open !== b.open) return a.open ? -1 : 1;
          return b.hours - a.hours;
        }),
      }));
  }

  function renderTimerSessions(rows) {
    const host = document.getElementById('ops-timer-sessions-list');
    if (!host) return;
    if (!Array.isArray(rows) || !rows.length) {
      host.innerHTML = '<p class="txt-muted" style="font-size:13px">최근 타이머 세션이 없습니다.</p>';
      return;
    }
    const days = groupTimerSessions(rows);
    host.innerHTML = days.map((day, di) => {
      const userCount = day.users.length;
      const sessCount = day.users.reduce((n, u) => n + u.sessions.length, 0);
      const hourSum = day.users.reduce((n, u) => n + u.hours, 0);
      return `
        <details class="ops-session-day" ${di === 0 ? 'open' : ''}>
          <summary>${esc(day.date)} · ${userCount}명 · ${sessCount}세션 · ${hourSum.toFixed(1)}h</summary>
          ${day.users.map((u) => `
            <details class="ops-session-user">
              <summary>${u.open ? '진행 · ' : ''}${esc(u.label)} · ${esc(u.schoolName)} · ${u.sessions.length}건 · ${Number(u.hours).toFixed(1)}h</summary>
              <div class="table-wrap">
                <table>
                  <thead><tr><th style="width:70px">상태</th><th>과목</th><th style="width:70px">시간(h)</th><th style="width:150px">시작</th></tr></thead>
                  <tbody>
                    ${u.sessions.map((r) => `
                      <tr>
                        <td>${r.open ? '<span class="pill pill-ok">진행</span>' : '-'}</td>
                        <td>${esc(r.subjectName || '전체')}</td>
                        <td>${Number(r.hours || 0).toLocaleString()}</td>
                        <td>${esc(fmtDate(r.startedAt))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </details>
          `).join('')}
        </details>
      `;
    }).join('');
  }

  async function loadActivityOps() {
    const { data } = await api('/analytics/activity?days=14');
    const s = data?.summary || {};
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set('activity-today-posts', Number(s.todayPosts || 0).toLocaleString());
    set('activity-today-comments', Number(s.todayComments || 0).toLocaleString());
    set('activity-today-chat', Number(s.todayChat || 0).toLocaleString());
    set('activity-today-pmail', Number(s.todayPersonalMail || 0).toLocaleString());
    set('activity-today-smail', Number(s.todaySchoolMail || 0).toLocaleString());
    renderActivityLineChart(data?.series || []);
    renderActivityFeed(data?.feed || []);
  }

  function renderActivityLineChart(series) {
    const svg = document.getElementById('activity-line-chart');
    const caption = document.getElementById('activity-line-caption');
    const tooltip = document.getElementById('activity-line-tooltip');
    if (!svg || !caption) return;
    if (!Array.isArray(series) || series.length === 0) {
      svg.innerHTML = '';
      if (tooltip) tooltip.hidden = true;
      caption.textContent = '아직 활동 데이터가 없습니다.';
      return;
    }
    svg.setAttribute('viewBox', '0 0 640 260');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = buildLineChartSvg({
      series,
      seriesA: (p) => Number(p.posts || 0),
      seriesB: (p) => Number(p.comments || 0),
      colorA: '#2563eb',
      colorB: '#ea580c',
      formatTick: (p) => String(p.date || '').slice(5),
    });
    bindLineChartHover(svg, tooltip, series, (point) => `
      <div><strong>${esc(point.date)}</strong></div>
      <div>글: ${Number(point.posts || 0).toLocaleString()}</div>
      <div>댓글: ${Number(point.comments || 0).toLocaleString()}</div>
      <div>쪽지: ${Number(point.chat || 0).toLocaleString()}</div>
      <div>우편: ${Number(point.mail || 0).toLocaleString()}</div>
    `);
    caption.textContent = '선은 글·댓글, 툴팁에 쪽지·우편 건수도 표시됩니다.';
  }

  function renderActivityFeed(rows) {
    const body = document.getElementById('ops-activity-feed-tbody');
    if (!body) return;
    if (!Array.isArray(rows) || !rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-row">최근 활동이 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((r) => `
      <tr>
        <td>${esc(r.typeLabel || r.type)}</td>
        <td>${esc(r.schoolName || '-')}</td>
        <td>${esc(formatOpsStudent(r))}</td>
        <td>${esc(r.preview || '')}</td>
        <td>${esc(fmtDate(r.at))}</td>
      </tr>
    `).join('');
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
    renderInstallHourChart(data?.byHour || []);
    renderInstallDowChart(data?.byDow || []);
  }

  function renderAnalyticsKpi(summary) {
    const latestDau = Number(summary.latestDau || 0);
    const latestMau = Number(summary.latestMauRolling30d || 0);
    document.getElementById('analytics-latest-dau').textContent = latestDau.toLocaleString();
    document.getElementById('analytics-latest-mau').textContent = latestMau.toLocaleString();
  }

  function svgPointToWrapCoords(svg, wrap, svgX, svgY) {
    const wrapRect = wrap.getBoundingClientRect();
    const ctm = svg.getScreenCTM?.();
    if (ctm && typeof svg.createSVGPoint === 'function') {
      const pt = svg.createSVGPoint();
      pt.x = svgX;
      pt.y = svgY;
      const screen = pt.matrixTransform(ctm);
      return {
        x: screen.x - wrapRect.left,
        y: screen.y - wrapRect.top,
      };
    }
    // fallback: viewBox meet 스케일
    const vb = svg.viewBox?.baseVal;
    const rect = svg.getBoundingClientRect();
    if (!vb || !vb.width || !vb.height) {
      return { x: 0, y: 0 };
    }
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
    const offsetX = (rect.width - vb.width * scale) / 2;
    const offsetY = (rect.height - vb.height * scale) / 2;
    return {
      x: rect.left - wrapRect.left + offsetX + svgX * scale,
      y: rect.top - wrapRect.top + offsetY + svgY * scale,
    };
  }

  function placeLineChartTooltip(tooltipEl, wrap, anchorX, anchorY) {
    if (!tooltipEl || !wrap) return;
    const pad = 6;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const tw = tooltipEl.offsetWidth || 0;
    const th = tooltipEl.offsetHeight || 0;
    const half = tw / 2;

    let left = anchorX;
    left = Math.max(pad + half, Math.min(wrapW - pad - half, left));

    // 기본: 점 위. 위쪽이 잘리면 점 아래로.
    const gap = 10;
    const spaceAbove = anchorY - pad;
    const placeAbove = spaceAbove >= th + gap;
    const transformY = placeAbove ? -(th + gap) : gap;

    // 아래로 둘 때도 카드 밖으로 너무 안 나가게
    let top = anchorY;
    if (!placeAbove && top + transformY + th > wrapH - pad) {
      top = Math.max(pad + th, wrapH - pad - th - gap);
    }

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.transform = `translate(-50%, ${transformY}px)`;
  }

  function bindLineChartHover(svg, tooltipEl, points, buildHtml) {
    if (!svg || !tooltipEl) return;
    const wrap = svg.closest('.analytics-line-wrap');
    if (!wrap) return;
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
        const cy = Number(el.dataset.anchorY || el.getAttribute('cy'));
        const { x, y } = svgPointToWrapCoords(svg, wrap, cx, cy);
        // 레이아웃 반영 후 크기 측정
        requestAnimationFrame(() => {
          placeLineChartTooltip(tooltipEl, wrap, x, y);
        });
      });
      el.addEventListener('mouseleave', hide);
    });
    svg.addEventListener('mouseleave', hide);
  }

  function buildLineChartSvg({
    series,
    seriesA,
    seriesB,
    colorA,
    colorB,
    formatTick,
  }) {
    const width = 640;
    const height = 260;
    const padL = 44;
    const padR = 16;
    const padTop = 16;
    const padBottom = 36;
    const chartW = width - padL - padR;
    const chartH = height - padTop - padBottom;
    const valuesA = series.map(seriesA);
    const valuesB = series.map(seriesB);
    const maxValue = Math.max(1, ...valuesA, ...valuesB);
    const x = (i) => padL + (chartW * i) / Math.max(1, series.length - 1);
    const y = (v) => padTop + chartH - (chartH * Number(v || 0)) / maxValue;

    const pathA = valuesA.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const pathB = valuesB.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

    const grid = [0, 0.5, 1].map((ratio) => {
      const gy = padTop + chartH - chartH * ratio;
      const label = Math.round(maxValue * ratio).toLocaleString();
      return `
        <line x1="${padL}" y1="${gy}" x2="${padL + chartW}" y2="${gy}" stroke="#e7e5e4" stroke-width="1" />
        <text x="${padL - 6}" y="${gy + 3}" text-anchor="end" fill="#a8a29e" font-size="10">${label}</text>
      `;
    }).join('');

    const tickStep = series.length > 10 ? 2 : 1;
    const xTicks = series.map((s, i) => {
      if (i % tickStep !== 0 && i !== series.length - 1) return '';
      const label = formatTick ? formatTick(s, i) : String(s.date || '').slice(5);
      return `<text x="${x(i)}" y="${height - 10}" text-anchor="middle" fill="#a8a29e" font-size="10">${esc(label)}</text>`;
    }).join('');

    const hits = series.map((_, i) => {
      const cx = x(i);
      const cyA = y(valuesA[i]);
      const cyB = y(valuesB[i]);
      // 툴팁은 더 위쪽(값 큰) 점에 맞춰 가려짐·싱크 개선
      const anchorY = Math.min(cyA, cyB);
      return `
        <circle cx="${cx}" cy="${cyA}" r="3.2" fill="${colorA}" />
        <circle cx="${cx}" cy="${cyB}" r="3.2" fill="${colorB}" />
        <circle class="analytics-line-hit" data-index="${i}" data-anchor-y="${anchorY.toFixed(1)}" cx="${cx}" cy="${anchorY.toFixed(1)}" r="14" fill="transparent" />
      `;
    }).join('');

    return `
      ${grid}
      <path d="${pathB}" fill="none" stroke="${colorB}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
      <path d="${pathA}" fill="none" stroke="${colorA}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
      ${hits}
      ${xTicks}
    `;
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

    svg.setAttribute('viewBox', '0 0 640 260');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = buildLineChartSvg({
      series,
      seriesA: (s) => Number(s.dauCount || 0),
      seriesB: (s) => Number(s.mauRolling30dCount || 0),
      colorA: '#16a34a',
      colorB: '#2563eb',
      formatTick: (s) => String(s.date || '').slice(5),
    });

    bindLineChartHover(svg, tooltip, series, (point) => `
      <div><strong>${esc(point.date)}</strong></div>
      <div>DAU: ${Number(point.dauCount || 0).toLocaleString()}</div>
      <div>MAU: ${Number(point.mauRolling30dCount || 0).toLocaleString()}</div>
    `);

    const first = series[0];
    const last = series[series.length - 1];
    caption.textContent = `${first.date} ~ ${last.date} · 포인트에 마우스를 올리면 수치가 표시됩니다.`;
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
      caption.textContent = '아직 /get 방문 데이터가 없습니다.';
      return;
    }

    svg.setAttribute('viewBox', '0 0 640 260');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = buildLineChartSvg({
      series,
      seriesA: (s) => Number(s.hits || 0),
      seriesB: (s) => Number(s.uniqueVisitors || 0),
      colorA: '#0f766e',
      colorB: '#c2410c',
      formatTick: (s) => String(s.date || '').slice(5),
    });

    bindLineChartHover(svg, tooltip, series, (point) => `
      <div><strong>${esc(point.date)}</strong></div>
      <div>방문: ${Number(point.hits || 0).toLocaleString()}회</div>
      <div>UV: ${Number(point.uniqueVisitors || 0).toLocaleString()}</div>
      <div>iOS ${Number(point.ios || 0)} · AOS ${Number(point.android || 0)} · 기타 ${Number(point.other || 0)}</div>
    `);

    const first = series[0];
    const last = series[series.length - 1];
    const uvNote = summary.uniqueAvailable ? 'UV는 Redis 근사치' : 'UV는 Redis 미설정';
    caption.textContent = `${first.date} ~ ${last.date} · ${uvNote}`;
  }

  function renderDashBarChart(containerId, values, labels, { color = '#0f766e', emptyText = '데이터 없음' } = {}) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const nums = Array.isArray(values) ? values.map((v) => Number(v || 0)) : [];
    if (!nums.length) {
      wrap.innerHTML = `<div class="txt-muted" style="font-size:12px;padding:24px 8px;">${esc(emptyText)}</div>`;
      return;
    }
    const max = Math.max(1, ...nums);
    wrap.innerHTML = nums.map((value, i) => {
      const pct = Math.max(value > 0 ? 4 : 2, (value / max) * 100);
      const label = labels?.[i] ?? String(i);
      return `
        <div class="dash-bar-col" title="${esc(label)}: ${value.toLocaleString()}회">
          <div class="dash-bar-fill" style="height:${pct.toFixed(1)}%;background:${color}"></div>
          <div class="dash-bar-label">${esc(label)}</div>
        </div>
      `;
    }).join('');
  }

  function renderInstallHourChart(byHour) {
    const caption = document.getElementById('install-hour-caption');
    const values = Array.isArray(byHour) && byHour.length === 24
      ? byHour
      : new Array(24).fill(0);
    const labels = values.map((_, hour) => (hour % 3 === 0 ? String(hour).padStart(2, '0') : ''));
    renderDashBarChart('install-hour-chart', values, labels, {
      color: '#0f766e',
      emptyText: '시간대 집계가 아직 없습니다.',
    });
    if (caption) {
      const total = values.reduce((s, v) => s + Number(v || 0), 0);
      const peak = values.reduce((best, v, i) => (v > (values[best] || 0) ? i : best), 0);
      caption.textContent = total > 0
        ? `합계 ${total.toLocaleString()}회 · 피크 ${String(peak).padStart(2, '0')}시`
        : '배포·마이그레이션 이후 방문부터 시간대가 쌓입니다.';
    }
  }

  function renderInstallDowChart(byDow) {
    const caption = document.getElementById('install-dow-caption');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const values = Array.isArray(byDow) && byDow.length === 7 ? byDow : new Array(7).fill(0);
    renderDashBarChart('install-dow-chart', values, days, {
      color: '#1d4ed8',
      emptyText: '요일 집계가 아직 없습니다.',
    });
    if (caption) {
      const total = values.reduce((s, v) => s + Number(v || 0), 0);
      const peak = values.reduce((best, v, i) => (v > (values[best] || 0) ? i : best), 0);
      caption.textContent = total > 0
        ? `합계 ${total.toLocaleString()}회 · ${days[peak]}요일이 가장 많음`
        : '일별 방문이 쌓이면 요일 분포가 표시됩니다.';
    }
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
