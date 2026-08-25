const ADMIN_BASE = window.__ADMIN_BASE__ || '';
const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_SESSION_EXPIRES_KEY = 'adminSessionExpiresAt';

function adminUrl(subpath) {
  const p = subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `${ADMIN_BASE}${p}`;
}

  function getAdminEnv() {
    return window.__ADMIN_DEPLOY_ENV__ || 'develop';
  }

  function getAdminHost() {
    return window.location.origin;
  }

  function getApiBase() {
    return `${getAdminHost()}/api/admin`;
  }

  function getAdminToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  }

  function setNavBadge(elementId, count) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const n = Number(count) || 0;
    if (n <= 0) {
      el.textContent = '';
      el.classList.add('nav-badge-hidden');
      return;
    }
    el.textContent = String(n);
    el.classList.remove('nav-badge-hidden');
  }

  function initDeployEnvBadge() {
    document.querySelectorAll('[data-deploy-env-badge]').forEach((el) => {
      const env = getAdminEnv();
      el.classList.remove('env-badge-develop', 'env-badge-production');
      el.classList.add(env === 'production' ? 'env-badge-production' : 'env-badge-develop');
      el.textContent = env === 'production' ? 'PRODUCTION' : 'DEVELOP';
    });
  }

  function closeAdminSidebar() {
    document.body.classList.remove('sidebar-open');
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '메뉴 열기');
    }
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
  }

  function openAdminSidebar() {
    const mq = window.matchMedia('(max-width: 768px)');
    if (!mq.matches) return;
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    document.body.classList.add('sidebar-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '메뉴 닫기');
    }
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
  }

  function initSidebarDrawer() {
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (!toggle || !overlay) return;

    const mq = window.matchMedia('(max-width: 768px)');

    toggle.addEventListener('click', () => {
      if (document.body.classList.contains('sidebar-open')) closeAdminSidebar();
      else openAdminSidebar();
    });

    overlay.addEventListener('click', closeAdminSidebar);

    mq.addEventListener('change', (e) => {
      if (!e.matches) closeAdminSidebar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAdminSidebar();
    });
  }

  function ensureAdminAuth() {
    if (!getAdminToken()) {
      window.location.href = adminUrl('/login');
      return false;
    }
    return true;
  }

  function adminLogout() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_EXPIRES_KEY);
    window.location.href = adminUrl('/login');
  }

  let sessionExpiresAt = 0;
  let sessionTimerInterval = null;

  function sessionExpiresKey() {
    return ADMIN_SESSION_EXPIRES_KEY;
  }

  function initSessionTimer() {
    const stored = Number(sessionStorage.getItem(sessionExpiresKey()) || 0);
    sessionExpiresAt = stored > Date.now() ? stored : Date.now() + 30 * 60 * 1000;
    sessionStorage.setItem(sessionExpiresKey(), String(sessionExpiresAt));
    updateSessionCountdown();
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(updateSessionCountdown, 1000);
  }

  function updateSessionCountdown() {
    const el = document.getElementById('session-countdown');
    if (!el) return;
    const remainMs = Math.max(0, sessionExpiresAt - Date.now());
    const totalSec = Math.ceil(remainMs / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    el.textContent = `${min}:${sec}`;
    if (remainMs <= 0) {
      alert('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
      adminLogout();
    }
  }

  async function extendAdminSession() {
    try {
      const token = getAdminToken();
      const res = await fetch(`${getAdminHost()}${adminUrl('/session/extend')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || '세션 연장에 실패했습니다.');
      }
      if (data.token) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      }
      if (data.expiresAt) {
        sessionExpiresAt = Number(data.expiresAt);
        sessionStorage.setItem(sessionExpiresKey(), String(sessionExpiresAt));
      } else {
        sessionExpiresAt = Date.now() + 30 * 60 * 1000;
        sessionStorage.setItem(sessionExpiresKey(), String(sessionExpiresAt));
      }
      updateSessionCountdown();
    } catch (e) {
      alert(e.message || '세션 연장 중 오류가 발생했습니다.');
    }
  }

  function initAdminHistoryGuard() {
    history.pushState({ adminGuard: true }, '', adminUrl('/'));
    window.addEventListener('popstate', () => {
      if (getAdminToken()) {
        history.pushState({ adminGuard: true }, '', adminUrl('/'));
      }
    });
  }

  const STUDENT_ID_REJECT_PRESET = [
    '학생증 사진이 흐리거나 잘린 경우',
    '이름이 일치하지 않음',
    '학교 정보가 일치하지 않음',
    '학생증이 아닌 사진',
  ];
  let pendingStudentIdRejectId = null;

  const PAGE_META = {
    dashboard: { title: '대시보드', sub: '신고·문의 운영 대기' },
    ops: { title: '모니터링', sub: 'DAU · 설치 링크 · 크론 이력' },
    reports: { title: '신고 관리', sub: '미처리 신고 전용' },
    processedReports: { title: '처리 이력', sub: '처리 완료/기각 신고 이력 및 재오픈' },
    appeals: { title: '이의신청 관리', sub: '소명 검토 및 상태 변경' },
    inquiries: { title: '문의 관리', sub: '미처리 문의 — 답변 작성 / 종결' },
    processedInquiries: { title: '문의 처리 이력', sub: '답변 완료 / 종결 문의 — 재오픈 가능' },
    users: { title: '사용자 제재 현황', sub: '경고 / 임시정지 / 화이트리스트' },
    attendance: { title: '등교 현황', sub: '출석 통계 · 미등교 의심 사용자' },
    emergency: { title: '비상 제어', sub: '긴급 스위치 · 유지보수 모드' },
    legalDocuments: { title: '약관·방침', sub: '이용약관 · 개인정보처리방침 편집' },
    adminAccounts: { title: '관리자 계정', sub: '계정·역할 관리 (최고관리자)' },
    studentIds: { title: '가입 학생증', sub: '회원가입 학생증 수동 검수 — 승인 / 거절' },
    manualSignup: { title: '수동 가입', sub: '학생 요청 시 관리자가 계정 직접 생성' },
    certificates: { title: '재학증명서', sub: '네이버 재학증명서 URL·열람번호 검수 — 승인 / 거절' },
    reverificationIds: { title: '재인증 학생증', sub: '학년도 재인증·학교 전환 검수 — 승인 / 거절' },
    logs: { title: '변경 이력 (Audit Log)', sub: '모든 판정 및 상태 변경 기록' },
  };

  const state = {
    adminProfile: null,
    loadedPanels: new Set(),
    studentIdSubmissions: [],
    certificateSubmissions: [],
    reverificationIdSubmissions: [],
    reports: [],
    processedReports: [],
    selectedReportId: null,
    selected: new Set(),
    expandedThreads: new Set(),
    processedSelected: new Set(),
    processedExpandedThreads: new Set(),
    reopenReportId: null,
    reopenBulkMode: false,
    bulkActionMode: null, // confirm | reject
    inquiries: [],
    processedInquiries: [],
    inquirySelected: new Set(),
    selectedInquiryId: null,
    selectedProcessedInquiryId: null,
    expandedProcessedInquiryIds: new Set(),
    inquiryReopenId: null,
    logs: [],
    logsPagination: { page: 1, limit: 50, total: 0 },
    emergencyFlags: null,
    legalDocuments: [],
    adminAccounts: [],
  };

  function threadKeyOf(report) {
    return `${report.target_type}:${report.target_id}`;
  }

  function fmtDate(v) {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '-';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yy}.${mm}.${dd} ${hh}:${mi}`;
  }

  function esc(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function statusPill(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'resolved' || s === 'accepted') return 'pill-resolved';
    if (s === 'rejected') return 'pill-rejected';
    return 'pill-pending';
  }

  function statusLabel(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return '대기';
    if (s === 'resolved') return '처리완료';
    if (s === 'rejected') return '기각';
    if (s === 'accepted') return '승인';
    return s ? `${s}` : '-';
  }

  function reportTypeLabel(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'post') return '게시글';
    if (t === 'comment') return '댓글';
    if (t === 'school_mail') return '학교메일';
    if (t === 'school_mail_comment') return '학교메일 댓글';
    if (t === 'mail') return '학교메일';
    if (t === 'mail_comment') return '학교메일 댓글';
    return t || '-';
  }

  function actionTypeLabel(actionType) {
    const a = String(actionType || '').toLowerCase();
    if (a === 'report_confirm') return '신고 확정(report_confirm)';
    if (a === 'report_reject') return '신고 기각(report_reject)';
    if (a === 'report_reopen') return '신고 재오픈(report_reopen)';
    if (a === 'appeal_update') return '이의신청 처리(appeal_update)';
    if (a === 'user_suspend') return '사용자 정지(user_suspend)';
    if (a === 'user_whitelist') return '화이트리스트 추가(user_whitelist)';
    if (a === 'user_unwhitelist') return '화이트리스트 해제(user_unwhitelist)';
    if (a === 'user_ban') return '사용자 영구정지(user_ban)';
    if (a === 'user_block_release') return '사용자 차단 해제(user_block_release)';
    if (a === 'inquiry_answer') return '문의 답변(inquiry_answer)';
    if (a === 'inquiry_close') return '문의 종결(inquiry_close)';
    if (a === 'inquiry_reopen') return '문의 재오픈(inquiry_reopen)';
    if (a === 'inquiry_delete') return '문의 삭제(inquiry_delete)';
    if (a === 'student_id_approve') return '학생증 승인(student_id_approve)';
    if (a === 'student_id_reject') return '학생증 거절(student_id_reject)';
    if (a === 'student_id_reapprove') return '학생증 재승인(student_id_reapprove)';
    if (a === 'reverification_student_id_approve') return '재인증 승인(reverification_student_id_approve)';
    if (a === 'reverification_student_id_reject') return '재인증 거절(reverification_student_id_reject)';
    if (a === 'reverification_student_id_reapprove') return '재인증 재승인(reverification_student_id_reapprove)';
    if (a === 'system_flags_update') return '시스템 플래그(system_flags_update)';
    if (a === 'admin_account_create') return '관리자 생성(admin_account_create)';
    if (a === 'admin_account_update') return '관리자 수정(admin_account_update)';
    if (a === 'user_manual_create') return '수동 가입(user_manual_create)';
    if (a === 'user_academic_update') return '학적 변경(user_academic_update)';
    if (a === 'user_shadow_mute') return '섀도우 뮤트(user_shadow_mute)';
    if (a === 'user_shadow_unmute') return '섀도우 해제(user_shadow_unmute)';
    return a || '-';
  }

  function inquiryStatusLabel(s) {
    const v = String(s || '').toLowerCase();
    if (v === 'pending') return '미처리';
    if (v === 'answered') return '답변완료';
    if (v === 'closed') return '종결';
    return s || '-';
  }

  function inquiryStatusPill(s) {
    const v = String(s || '').toLowerCase();
    if (v === 'answered') return 'pill-resolved';
    if (v === 'closed') return 'pill-rejected';
    return 'pill-pending';
  }

  function renderTargetImages(imageUrls) {
    const urls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
    if (!urls.length) return '';
    return `
      <div class="section-title">첨부 이미지</div>
      <div class="image-grid">
        ${urls.map((url, idx) => `<a href="${esc(url)}" target="_blank" rel="noreferrer"><img class="image-item" src="${esc(url)}" alt="첨부 이미지 ${idx + 1}"></a>`).join('')}
      </div>
    `;
  }

  function reasonLabel(reason) {
    const r = String(reason || '').toLowerCase();
    if (r === 'spam') return '스팸/광고(spam)';
    if (r === 'hate') return '욕설/혐오(hate)';
    if (r === 'sexual') return '음란/선정적(sexual)';
    if (r === 'privacy') return '개인정보(privacy)';
    if (r === 'etc') return '기타(etc)';
    return reason ? `${reason}` : '-';
  }

  function reportTypePill(type) {
    if (type === 'comment') return 'pill-comment';
    if (type === 'school_mail' || type === 'mail') return 'pill-mail';
    if (type === 'school_mail_comment' || type === 'mail_comment') return 'pill-mail';
    return 'pill-post';
  }

  async function api(path, init = {}) {
    const token = getAdminToken();
    const res = await fetch(`${getApiBase()}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || (res.status === 403 && data?.code === 'ADMIN_MFA_REQUIRED')) {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      window.location.href = adminUrl('/login');
      throw new Error(data?.message || '로그인이 필요합니다.');
    }
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `요청 실패 (${res.status})`);
    }
    return data;
  }

  function getAdminRole() {
    return window.__ADMIN_ROLE__ || state.adminProfile?.role || 'moderator';
  }

  function canAccessPanel(panel) {
    const r = getAdminRole();
    if (r === 'super') return true;
    const map = {
      dashboard: ['moderator', 'support', 'verifier'],
      ops: ['moderator'],
      reports: ['moderator'],
      processedReports: ['moderator'],
      appeals: ['moderator'],
      inquiries: ['moderator', 'support'],
      processedInquiries: ['moderator', 'support'],
      studentIds: ['moderator', 'verifier'],
      manualSignup: ['moderator'],
      certificates: ['moderator', 'verifier'],
      reverificationIds: ['moderator', 'verifier'],
      attendance: ['moderator'],
      users: ['moderator'],
      logs: ['moderator', 'support'],
      emergency: ['super'],
      legalDocuments: ['moderator'],
      adminAccounts: ['super'],
    };
    return (map[panel] || []).includes(r);
  }

  function applyRoleNavVisibility() {
    document.querySelectorAll('.nav-item[data-panel]').forEach((el) => {
      const panel = el.getAttribute('data-panel');
      el.style.display = canAccessPanel(panel) ? '' : 'none';
    });
  }

  async function loadAdminProfile() {
    const { data } = await api('/accounts/me');
    state.adminProfile = data;
    window.__ADMIN_ROLE__ = data.role;
    applyRoleNavVisibility();
    const roleEl = document.getElementById('topbar-admin-role');
    if (roleEl) {
      const labels = { super: '최고관리자', moderator: '운영', support: '문의', verifier: '인증' };
      roleEl.textContent = labels[data.role] || data.role;
    }
    return data;
  }

  async function ensurePanelLoaded(page) {
    if (state.loadedPanels.has(page)) return;
    const loader = window.PANEL_LOADERS?.[page];
    if (typeof loader === 'function') {
      await loader();
      state.loadedPanels.add(page);
    }
  }

  async function refreshNavBadges() {
    try {
      const tasks = [
        api('/signup-student-ids?status=pending&purpose=signup&limit=50').then((r) => {
          setNavBadge('badge-student-ids', (r.data?.submissions || []).length);
        }),
        api('/signup-certificates?status=pending&limit=50').then((r) => {
          setNavBadge('badge-certificates', (r.data?.submissions || []).length);
        }),
        api('/signup-student-ids?status=pending&purpose=reverification&limit=50').then((r) => {
          setNavBadge('badge-reverification-ids', (r.data?.submissions || []).length);
        }),
        api('/attendance/suspicious?days=14&limit=1').then((r) => {
          setNavBadge('badge-attendance-suspicious', r.data?.totalSuspicious || 0);
        }),
      ];
      await Promise.allSettled(tasks);
    } catch {
      // non-fatal
    }
  }

  function go(page) {
    if (!canAccessPanel(page)) {
      alert('이 메뉴에 접근할 권한이 없습니다.');
      return;
    }
    closeAdminSidebar();
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((n) => {
      if (n.getAttribute('onclick') === `go('${page}')`) n.classList.add('active');
    });
    const panel = document.getElementById(`panel-${page}`);
    if (panel) panel.classList.add('active');
    const m = PAGE_META[page];
    document.getElementById('topbar-title').textContent = m.title;
    document.getElementById('topbar-sub').textContent = m.sub;
    ensurePanelLoaded(page).catch((e) => alert(e.message));
  }

  function purposeLabel(purpose) {
    if (purpose === 'reverification') return '재인증';
    if (purpose === 'resubmit') return '거절 재제출';
    return '가입';
  }

  function renderSchoolTransition(s) {
    const from = s.previous_school_name || '(이전 학교 미기록)';
    const to = s.school_name || '-';
    if (s.submission_purpose === 'reverification' && s.previous_school_id && s.previous_school_id !== s.school_id) {
      return `<div class="user-sub" style="color:var(--accent);font-weight:600;">학교 전환: ${esc(from)} → ${esc(to)}</div>`;
    }
    if (s.submission_purpose === 'reverification') {
      return `<div class="user-sub">재학 학교: ${esc(to)} (변동 없음)</div>`;
    }
    return '';
  }
