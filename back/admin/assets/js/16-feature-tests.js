function featureTestRenderResult(startedAt, status, body) {
  const statusEl = document.getElementById('ft-status');
  const timeEl = document.getElementById('ft-time');
  const bypassEl = document.getElementById('ft-bypass');
  const jsonEl = document.getElementById('ft-json');
  if (statusEl) statusEl.textContent = status == null ? '—' : String(status);
  if (timeEl) timeEl.textContent = `${Date.now() - startedAt}ms`;
  const bypassed = body?.bypassedExternalCalls || body?.sentEvents;
  if (bypassEl) {
    bypassEl.textContent = Array.isArray(bypassed)
      ? JSON.stringify(bypassed, null, 2)
      : '—';
  }
  if (jsonEl) jsonEl.textContent = JSON.stringify(body ?? {}, null, 2);
}

async function featureTestRequest(path, payload) {
  const startedAt = Date.now();
  const token = getAdminToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  featureTestRenderResult(startedAt, res.status, body);
}

function featureTestMock(status, body) {
  featureTestRenderResult(Date.now(), status, body);
}

function featureTestSelectedUserId() {
  return document.getElementById('ft-user-select')?.value || '';
}

function featureTestEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function featureTestUserLabel(user) {
  const name = featureTestEscape(user.username || '아이디 없음');
  const school = user.schoolName ? ` · ${featureTestEscape(user.schoolName)}` : '';
  return `${name} · #${user.id}${school}`;
}

async function loadFeatureTestUsers() {
  const select = document.getElementById('ft-user-select');
  if (!select) return;
  const previous = select.value;
  const q = document.getElementById('ft-user-search')?.value?.trim() || '';
  select.innerHTML = '<option value="">불러오는 중…</option>';
  try {
    const token = getAdminToken();
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await fetch(`${getApiBase()}/feature-tests/users${qs}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await res.json().catch(() => ({}));
    const users = Array.isArray(body?.data?.users) ? body.data.users : [];
    const options = ['<option value="">유저를 선택하세요</option>'];
    users.forEach((user) => {
      const id = String(user.id);
      const selected = id === previous ? ' selected' : '';
      options.push(
        `<option value="${id}"${selected}>${featureTestUserLabel(user)}</option>`,
      );
    });
    select.innerHTML = options.join('');
    if (!users.length) {
      select.innerHTML = '<option value="">검색 결과가 없습니다</option>';
    }
  } catch {
    select.innerHTML = '<option value="">유저 목록을 불러오지 못했습니다</option>';
  }
}

function featureTestShowTrack(name) {
  const dry = document.getElementById('ft-track-dry');
  const toast = document.getElementById('ft-track-toast');
  if (dry) dry.style.display = name === 'dry' ? '' : 'none';
  if (toast) toast.style.display = name === 'toast' ? '' : 'none';
}

function mountFeatureTests() {
  const host = document.getElementById('feature-tests-host');
  if (!host || host.dataset.ready === '1') return;
  host.dataset.ready = '1';
  host.innerHTML = `
    <div style="margin-bottom:12px;">
      <label>대상 유저</label>
      <input id="ft-user-search" class="input" placeholder="아이디 또는 번호 검색" style="width:100%;margin:4px 0 8px;" />
      <select id="ft-user-select" class="input" style="width:100%;margin:0 0 8px;"></select>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button type="button" class="btn" id="ft-tab-dry">게시글 · 댓글 Dry-Run</button>
      <button type="button" class="btn" id="ft-tab-toast">알림 토스트</button>
    </div>
    <div id="ft-track-dry" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
      <div>
        <label>종류</label>
        <select id="ft-kind" class="input" style="width:100%;margin:4px 0 8px;">
          <option value="comment">댓글</option>
          <option value="post">게시글</option>
        </select>
        <label>게시글 ID (댓글)</label>
        <input id="ft-post" class="input" style="width:100%;margin:4px 0 8px;" />
        <label>부모 댓글 ID (대댓글, 선택)</label>
        <input id="ft-parent" class="input" style="width:100%;margin:4px 0 8px;" />
        <label>게시판 (student / school / national)</label>
        <input id="ft-board" class="input" value="student" style="width:100%;margin:4px 0 8px;" />
        <label>학교 ID (school)</label>
        <input id="ft-school" class="input" style="width:100%;margin:4px 0 8px;" />
        <label>내용</label>
        <textarea id="ft-content" class="input" rows="4" style="width:100%;margin:4px 0 8px;">기능 테스트 본문</textarea>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button type="button" class="btn" id="ft-run-dry">Dry-Run 실행</button>
          <button type="button" class="btn" id="ft-mock-ok">Mock 성공</button>
          <button type="button" class="btn" id="ft-mock-valid">Mock 유효성 에러</button>
          <button type="button" class="btn" id="ft-mock-empty">Mock 빈 배열</button>
          <button type="button" class="btn" id="ft-mock-401">Mock 401</button>
          <button type="button" class="btn" id="ft-mock-500">Mock 500</button>
        </div>
      </div>
      <div>
        <div>HTTP Status: <strong id="ft-status">—</strong></div>
        <div>Execution Time: <strong id="ft-time">—</strong></div>
        <div style="margin-top:8px;">Bypassed / Sent</div>
        <pre id="ft-bypass" style="white-space:pre-wrap;">—</pre>
        <div>Response JSON</div>
        <pre id="ft-json" style="white-space:pre-wrap;max-height:360px;overflow:auto;">{}</pre>
      </div>
    </div>
    <div id="ft-track-toast" style="display:none;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
      <div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button type="button" class="btn" data-ft-event="notification" data-ft-variant="comment">notification 댓글</button>
          <button type="button" class="btn" data-ft-event="notification" data-ft-variant="reply">notification 답글</button>
          <button type="button" class="btn" data-ft-event="friend_poke">friend_poke</button>
          <button type="button" class="btn" data-ft-event="friend_study_finished_summary">공부 요약</button>
          <button type="button" class="btn" data-ft-event="new_message">new_message</button>
        </div>
      </div>
      <div>
        <p class="txt-muted">결과는 왼쪽 Dry-Run 칸과 같은 응답 영역에 표시됩니다. 공부 요약은 토스트용 notification을 함께 보냅니다.</p>
      </div>
    </div>
  `;

  document.getElementById('ft-tab-dry')?.addEventListener('click', () => featureTestShowTrack('dry'));
  document.getElementById('ft-tab-toast')?.addEventListener('click', () => {
    featureTestShowTrack('toast');
    const toast = document.getElementById('ft-track-toast');
    if (toast) toast.style.display = 'grid';
  });
  document.getElementById('ft-run-dry')?.addEventListener('click', () => {
    const kind = document.getElementById('ft-kind')?.value;
    featureTestRequest('/feature-tests/dry-run', {
      kind,
      targetUserId: featureTestSelectedUserId(),
      postId: document.getElementById('ft-post')?.value,
      parentCommentId: document.getElementById('ft-parent')?.value,
      boardType: document.getElementById('ft-board')?.value,
      schoolId: document.getElementById('ft-school')?.value,
      content: document.getElementById('ft-content')?.value,
    });
  });
  document.getElementById('ft-mock-ok')?.addEventListener('click', () => {
    featureTestMock(200, { success: true, data: { id: 1 }, bypassedExternalCalls: [] });
  });
  document.getElementById('ft-mock-valid')?.addEventListener('click', () => {
    featureTestMock(400, { success: false, message: '댓글 내용을 입력해주세요.' });
  });
  document.getElementById('ft-mock-empty')?.addEventListener('click', () => {
    featureTestMock(200, { success: true, data: [] });
  });
  document.getElementById('ft-mock-401')?.addEventListener('click', () => {
    featureTestMock(401, { success: false, message: '인증 토큰이 필요합니다.' });
  });
  document.getElementById('ft-mock-500')?.addEventListener('click', () => {
    featureTestMock(500, { success: false, message: '서버 오류' });
  });
  let searchTimer = null;
  document.getElementById('ft-user-search')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadFeatureTestUsers, 250);
  });
  loadFeatureTestUsers();
  host.querySelectorAll('[data-ft-event]').forEach((button) => {
    button.addEventListener('click', () => {
      featureTestRequest('/feature-tests/socket-toast', {
        targetUserId: featureTestSelectedUserId(),
        eventType: button.getAttribute('data-ft-event'),
        variant: button.getAttribute('data-ft-variant') || undefined,
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', mountFeatureTests);
