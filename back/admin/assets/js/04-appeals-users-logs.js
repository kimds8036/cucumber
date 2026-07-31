async function loadAppeals() {
    const { data } = await api('/appeals');
    const list = data.appeals || [];
    const container = document.getElementById('appeals-list');
    if (!list.length) {
      container.innerHTML = `<div class="txt-muted">이의신청이 없습니다.</div>`;
      return;
    }
    container.innerHTML = list.map((a) => `
      <div class="appeal-card">
        <div class="appeal-header">
          <span class="appeal-header-title">#A-${a.id}</span>
          <span class="pill ${statusPill(a.status)}">${esc(statusLabel(a.status))}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)">${fmtDate(a.created_at)} 접수</span>
        </div>
        <div class="appeal-body">
          <div class="detail-grid" style="margin-bottom:12px">
            <div class="detail-block"><div class="detail-block-label">신청자</div><div class="detail-block-value">UID #${esc(a.appellant_id)}</div></div>
            <div class="detail-block"><div class="detail-block-label">대상 게시글</div><div class="detail-block-value">post #${esc(a.post_id)}</div></div>
          </div>
          <div class="section-title">소명 내용</div>
          <div class="appeal-content">${esc(a.content)}</div>
          <div class="section-title">관리자 검토 메모</div>
          <textarea class="note-input" id="note-appeal-${a.id}" placeholder="검토 메모를 입력하세요">${esc(a.review_note || '')}</textarea>
          <div class="appeal-actions">
            <button class="btn btn-green" onclick="appealAction(${a.id}, 'accepted')">승인(accepted) — 게시글 복구</button>
            <button class="btn btn-red" onclick="appealAction(${a.id}, 'rejected')">반려(rejected) — 제재 유지</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function appealAction(id, action) {
    const note = document.getElementById(`note-appeal-${id}`)?.value?.trim() || null;
    try {
      await api(`/appeals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action, review_note: note }),
      });
      await Promise.all([loadDashboard(), loadAppeals(), loadLogs()]);
      alert('이의신청 처리가 완료되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function loadUsers() {
    const qInput = document.getElementById('users-search-q')?.value?.trim() || '';
    const filter = document.getElementById('users-filter')?.value || '';
    const minViolationWarning = document.getElementById('users-min-violation')?.value?.trim() || '';
    const minFalseReportWarning = document.getElementById('users-min-false-report')?.value?.trim() || '';
    const minReported = document.getElementById('users-min-reported')?.value?.trim() || '';
    const minBlockedBy = document.getElementById('users-min-blocked-by')?.value?.trim() || '';
    const sanction = document.getElementById('users-sanction-filter')?.value || '';
    const qs = new URLSearchParams();
    if (qInput) qs.set('q', qInput);
    if (filter) qs.set('filter', filter);
    if (minViolationWarning) qs.set('minViolationWarning', minViolationWarning);
    if (minFalseReportWarning) qs.set('minFalseReportWarning', minFalseReportWarning);
    if (minReported) qs.set('minReported', minReported);
    if (sanction) qs.set('sanction', sanction);
    const { data } = await api(`/users?${qs.toString()}`);
    let list = data.users || [];
    const minBlockedByNum = Number(minBlockedBy);
    if (Number.isFinite(minBlockedByNum) && minBlockedByNum > 0) {
      list = list.filter((u) => Number(u.blocked_by_count || 0) >= minBlockedByNum);
    }
    state.usersById = new Map(list.map((u) => [Number(u.id), u]));
    const container = document.getElementById('users-list');
    if (!list.length) {
      container.innerHTML = `<div class="txt-muted">사용자 데이터가 없습니다.</div>`;
      return;
    }
    container.innerHTML = list.map((u) => `
      <div class="user-card">
        <div class="user-header">
          <div class="user-avatar">${esc((u.username || u.name || `U${u.id}`).slice(0, 2).toUpperCase())}</div>
          <div>
            <div class="user-name">
              ${esc(u.username || '-')} <span style="font-size:11px;color:var(--text-tertiary);font-weight:400;">(UID #${u.id})</span>
              ${u.is_whitelisted ? '<span class="pill pill-white" style="margin-left:8px;font-size:10px">화이트리스트</span>' : ''}
              ${u.is_banned ? '<span class="pill pill-danger" style="margin-left:8px;font-size:10px">영구 정지</span>' : ''}
              ${u.is_suspended && !u.is_banned ? '<span class="pill pill-warn" style="margin-left:8px;font-size:10px">임시 정지</span>' : ''}
              ${u.is_shadow_muted ? '<span class="pill pill-warn" style="margin-left:8px;font-size:10px">섀도우 뮤트</span>' : ''}
            </div>
            <div class="user-sub">${esc(u.name || '-')}</div>
            <div class="user-sub" style="margin-top:2px">
              ${esc(u.school_name || u.school_id || '학교 미설정')}
              · ${u.grade != null ? `${u.grade}학년` : '-'}
              ${u.class_number != null ? `${u.class_number}반` : ''}
              ${u.graduation_year ? ` · 졸업 ${u.graduation_year}` : ''}
              ${u.student_verified ? '' : ' · <span class="txt-danger">미인증</span>'}
            </div>
          </div>
        </div>
        <div class="user-stats-grid">
          <div class="user-stat"><div class="user-stat-num ${u.violation_warning_count > 0 ? 'txt-danger' : 'txt-ok'}">${u.violation_warning_count || 0}</div><div class="user-stat-label">위반 경고</div></div>
          <div class="user-stat"><div class="user-stat-num">${u.false_report_warning_count || 0}</div><div class="user-stat-label">허위신고 경고</div></div>
          <div class="user-stat"><div class="user-stat-num">${u.post_count || 0}</div><div class="user-stat-label">총 게시글</div></div>
          <div class="user-stat"><div class="user-stat-num ${Number(u.reported_count || 0) > 0 ? 'txt-danger' : ''}">${u.reported_count || 0}</div><div class="user-stat-label">신고당한 수</div></div>
          <div class="user-stat"><div class="user-stat-num">${u.blocked_by_count || 0}</div><div class="user-stat-label">차단당한 수</div></div>
        </div>
        <div class="user-actions-row">
          <button class="btn btn-sm" onclick="openUserAcademicDialog(${u.id})">학적 변경</button>
          <button class="btn btn-sm btn-amber" onclick="suspendUser(${u.id})">임시 정지</button>
          ${u.is_whitelisted
            ? `<button class="btn btn-sm btn-red" onclick="unwhitelistUser(${u.id})">화이트리스트 해제</button>`
            : `<button class="btn btn-sm" onclick="whitelistUser(${u.id})">화이트리스트 추가</button>`}
          <button class="btn btn-sm btn-red" onclick="banUser(${u.id})">영구 정지</button>
          ${u.is_shadow_muted
            ? `<button class="btn btn-sm" onclick="shadowMuteUser(${u.id}, false)">섀도우 해제</button>`
            : `<button class="btn btn-sm btn-amber" onclick="shadowMuteUser(${u.id}, true)">섀도우 뮤트</button>`}
          <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)">${u.suspended_until ? `정지 해제 예정: ${fmtDate(u.suspended_until)}` : ''}</span>
        </div>
      </div>
    `).join('');
  }

  async function suspendUser(uid) {
    const days = prompt('임시 정지 기간(일)을 입력하세요', '3');
    if (!days) return;
    try {
      await api(`/users/${uid}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ days: Number(days) || 3 }),
      });
      await Promise.all([loadUsers(), loadLogs()]);
      alert('임시 정지 처리되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function whitelistUser(uid) {
    try {
      await api(`/users/${uid}/whitelist`, { method: 'POST' });
      await Promise.all([loadUsers(), loadLogs()]);
      alert('화이트리스트에 추가되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function unwhitelistUser(uid) {
    try {
      await api(`/users/${uid}/whitelist`, { method: 'DELETE' });
      await Promise.all([loadUsers(), loadLogs()]);
      alert('화이트리스트에서 해제되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function banUser(uid) {
    if (!confirm(`UID #${uid}을 영구 정지하시겠습니까?\n(최고관리자 권한 필요)`)) return;
    try {
      await api(`/users/${uid}/ban`, { method: 'POST' });
      await Promise.all([loadUsers(), loadLogs()]);
      alert('영구 정지 처리되었습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function shadowMuteUser(uid, enabled) {
    const reason = prompt(enabled ? '섀도우 뮤트 사유 (선택)' : '해제 사유 (선택)') || '';
    try {
      await api(`/users/${uid}/shadow-mute`, {
        method: 'POST',
        body: JSON.stringify({ enabled, reason }),
      });
      await Promise.all([loadUsers(), loadLogs()]);
      alert(enabled ? '섀도우 뮤트를 적용했습니다.' : '섀도우 뮤트를 해제했습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  let academicEditUserId = null;
  let academicEditSchool = null;
  let academicSchoolSearchResults = [];

  function openUserAcademicDialog(uid) {
    const u = state.usersById?.get(Number(uid));
    if (!u) {
      alert('사용자 정보를 찾을 수 없습니다. 목록을 다시 불러와 주세요.');
      return;
    }
    academicEditUserId = Number(u.id);
    academicEditSchool = u.school_id
      ? { id: u.school_id, name: u.school_name || u.school_id }
      : null;
    academicSchoolSearchResults = [];

    const uidEl = document.getElementById('user-academic-uid');
    if (uidEl) uidEl.textContent = `· ${u.username || '-'} (UID #${u.id})`;

    const currentEl = document.getElementById('user-academic-current');
    if (currentEl) {
      currentEl.textContent = `현재: ${u.school_name || u.school_id || '-'} / ${u.grade ?? '-'}학년 ${u.class_number ?? '-'}반 / 졸업 ${u.graduation_year ?? '-'}`;
    }

    const gradeEl = document.getElementById('user-academic-grade');
    if (gradeEl) gradeEl.value = String(u.grade || 1);
    const classEl = document.getElementById('user-academic-class');
    if (classEl) classEl.value = String(u.class_number || 1);
    const gradEl = document.getElementById('user-academic-grad-year');
    if (gradEl) gradEl.value = u.graduation_year != null ? String(u.graduation_year) : '';
    const exEl = document.getElementById('user-academic-grade-exception');
    if (exEl) exEl.checked = Boolean(u.grade_exception);
    const noteEl = document.getElementById('user-academic-note');
    if (noteEl) noteEl.value = '';
    const resultsEl = document.getElementById('user-academic-school-results');
    if (resultsEl) resultsEl.innerHTML = '';
    const qEl = document.getElementById('user-academic-school-q');
    if (qEl) qEl.value = '';

    renderUserAcademicSchoolPick();
    document.getElementById('user-academic-dialog')?.classList.add('show');
  }

  function renderUserAcademicSchoolPick() {
    const host = document.getElementById('user-academic-school-pick');
    if (!host) return;
    if (!academicEditSchool?.id) {
      host.innerHTML = '<span class="txt-muted">학교를 검색해 선택하세요.</span>';
      return;
    }
    host.innerHTML = `<strong>${esc(academicEditSchool.name)}</strong>
      <span class="txt-muted"> — ${esc(academicEditSchool.id)}</span>
      <button type="button" class="btn btn-sm" style="margin-left:8px" onclick="clearUserAcademicSchool()">변경</button>`;
  }

  function clearUserAcademicSchool() {
    academicEditSchool = null;
    renderUserAcademicSchoolPick();
  }

  async function searchUserAcademicSchools() {
    const q = document.getElementById('user-academic-school-q')?.value?.trim() || '';
    const host = document.getElementById('user-academic-school-results');
    if (!host) return;
    if (q.length < 2) {
      host.innerHTML = '<p class="txt-muted">2글자 이상 입력하세요.</p>';
      return;
    }
    host.innerHTML = '<p class="txt-muted">검색 중…</p>';
    try {
      const res = await fetch(
        `${getAdminHost()}/api/schools/search?query=${encodeURIComponent(q)}&limit=8`,
      );
      const data = await res.json();
      const schools = data?.data?.schools || [];
      if (!schools.length) {
        host.innerHTML = '<p class="txt-muted">검색 결과가 없습니다.</p>';
        return;
      }
      academicSchoolSearchResults = schools;
      host.innerHTML = schools
        .map(
          (s, idx) => `
        <button type="button" class="btn btn-sm" style="margin:4px 4px 0 0"
          onclick="pickUserAcademicSchoolByIndex(${idx})">
          ${esc(s.name)} (${esc(s.region || s.id)})
        </button>`,
        )
        .join('');
    } catch (error) {
      host.innerHTML = `<p class="txt-muted">검색 실패: ${esc(error.message)}</p>`;
    }
  }

  function pickUserAcademicSchoolByIndex(idx) {
    const school = academicSchoolSearchResults[idx];
    if (!school) return;
    academicEditSchool = school;
    renderUserAcademicSchoolPick();
    const host = document.getElementById('user-academic-school-results');
    if (host) host.innerHTML = '';
  }

  function closeUserAcademicDialog() {
    document.getElementById('user-academic-dialog')?.classList.remove('show');
    academicEditUserId = null;
    academicEditSchool = null;
    academicSchoolSearchResults = [];
  }

  function closeUserAcademicByBackdrop(event) {
    if (event.target?.id === 'user-academic-dialog') closeUserAcademicDialog();
  }

  async function submitUserAcademic() {
    if (!academicEditUserId) return;
    if (!academicEditSchool?.id) {
      alert('학교를 검색해 선택해 주세요.');
      return;
    }
    const grade = Number(document.getElementById('user-academic-grade')?.value);
    const classNumber = Number(document.getElementById('user-academic-class')?.value);
    const graduationYearRaw = document.getElementById('user-academic-grad-year')?.value?.trim();
    const graduationYear = graduationYearRaw === '' ? null : Number(graduationYearRaw);
    const gradeException = Boolean(document.getElementById('user-academic-grade-exception')?.checked);
    const note = document.getElementById('user-academic-note')?.value?.trim() || null;

    if (!confirm(`UID #${academicEditUserId} 학적을 변경할까요?\n${academicEditSchool.name} / ${grade}학년 ${classNumber}반`)) {
      return;
    }

    try {
      await api(`/users/${academicEditUserId}/academic`, {
        method: 'POST',
        body: JSON.stringify({
          schoolId: academicEditSchool.id,
          grade,
          classNumber,
          graduationYear,
          gradeException,
          note,
        }),
      });
      closeUserAcademicDialog();
      await Promise.all([loadUsers(), loadLogs()]);
      alert('학적을 변경했습니다.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function applyUsersFilter() {
    try {
      await loadUsers();
    } catch (error) {
      alert(error.message);
    }
  }

  async function loadLogs(page = 1) {
    const qInput = document.getElementById('logs-search-q')?.value?.trim() || '';
    const action = document.getElementById('logs-action')?.value || '';
    const fromDate = document.getElementById('logs-from-date')?.value || '';
    const toDate = document.getElementById('logs-to-date')?.value || '';
    const qs = new URLSearchParams();
    if (qInput) qs.set('q', qInput);
    if (action) qs.set('action', action);
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    qs.set('page', String(page));
    qs.set('limit', '50');
    const { data } = await api(`/logs?${qs.toString()}`);
    const list = data.logs || [];
    state.logsPagination = data.pagination || { page, limit: 50, total: list.length };
    const tbody = document.getElementById('logs-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="txt-muted">변경 이력이 없습니다.</td></tr>`;
    } else {
      tbody.innerHTML = list.map((l) => `
      <tr>
        <td class="txt-muted">${fmtDate(l.created_at)}</td>
        <td>admin #${esc(l.admin_user_id)}</td>
        <td>${esc(l.target_type)} #${esc(l.target_id)}</td>
        <td><span class="pill ${statusPill(l.action_type.includes('reject') ? 'rejected' : l.action_type.includes('confirm') || l.action_type.includes('accept') ? 'resolved' : 'pending')}">${esc(actionTypeLabel(l.action_type))}</span></td>
        <td style="color:var(--text-secondary)">${esc(l.note || '-')}</td>
      </tr>
    `).join('');
    }
    const pag = document.getElementById('logs-pagination');
    if (pag) {
      const { page: p, limit, total } = state.logsPagination;
      const maxPage = Math.max(1, Math.ceil(total / limit));
      pag.innerHTML = `
        <span class="txt-muted">총 ${total}건 · ${p}/${maxPage}페이지</span>
        <button class="btn btn-sm" ${p <= 1 ? 'disabled' : ''} onclick="loadLogs(${p - 1})">이전</button>
        <button class="btn btn-sm" ${p >= maxPage ? 'disabled' : ''} onclick="loadLogs(${p + 1})">다음</button>
      `;
    }
  }

  async function applyLogsFilter() {
    try {
      await loadLogs();
    } catch (error) {
      alert(error.message);
    }
  }

  async function loadDelayed() {
    let source = state.reports;
    if (!source.length) {
      try {
        const { data } = await api('/reports?view=pending&limit=200');
        source = data.reports || [];
      } catch {
        source = [];
      }
    }
    const delayed = source.filter((r) => {
      const created = new Date(r.created_at).getTime();
      if (!created) return false;
      const diffDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
      return r.status === 'pending' && diffDays >= 3;
    });
    const tbody = document.getElementById('dashboard-delayed-tbody');
    if (!delayed.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="txt-muted">3일 이상 미처리 건이 없습니다.</td></tr>`;
      return;
    }
    tbody.innerHTML = delayed.slice(0, 10).map((r) => {
      const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return `
        <tr>
          <td>#R-${r.id}</td>
          <td><span class="pill ${reportTypePill(r.target_type)}">${esc(r.target_type)}</span></td>
          <td>${esc(r.reason)}</td>
          <td class="txt-muted">${fmtDate(r.created_at)}</td>
          <td class="txt-danger">${days}일</td>
          <td><button class="btn btn-sm" onclick="go('reports');toggleDetail(${r.id});">검토 →</button></td>
        </tr>
      `;
    }).join('');
  }

  // ───────────────────────── 문의 관리 ─────────────────────────
