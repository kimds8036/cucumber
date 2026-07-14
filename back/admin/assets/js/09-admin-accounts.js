const ROLE_OPTIONS = [
  { value: 'super', label: '최고관리자' },
  { value: 'moderator', label: '운영관리자' },
  { value: 'support', label: '문의담당' },
  { value: 'verifier', label: '인증검수' },
];

function roleLabel(role) {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label || role;
}

async function loadAdminAccounts() {
  const host = document.getElementById('admin-accounts-host');
  if (!host) return;
  host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
  const { data } = await api('/accounts/accounts');
  state.adminAccounts = data.accounts || [];

  const rows = state.adminAccounts
    .map(
      (a) => `
    <tr>
      <td>#${a.id}</td>
      <td>${esc(a.username)}</td>
      <td>${esc(a.name)}</td>
      <td>${esc(roleLabel(a.role))}</td>
      <td>${a.is_deleted ? '<span class="pill pill-danger">비활성</span>' : '<span class="pill pill-ok">활성</span>'}</td>
      <td class="txt-muted">${fmtDate(a.last_login_at)}</td>
      <td>
        <button class="btn btn-sm" onclick="editAdminAccount(${a.id})">수정</button>
      </td>
    </tr>
  `,
    )
    .join('');

  host.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>아이디</th><th>이름</th><th>역할</th><th>상태</th><th>마지막 로그인</th><th></th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" class="txt-muted">계정 없음</td></tr>'}</tbody>
      </table>
    </div>
    <div class="section-title" style="margin-top:20px">새 관리자 계정</div>
    <div class="detail-grid">
      <div class="detail-block">
        <div class="detail-block-label">아이디</div>
        <input type="text" class="note-input" id="new-admin-username" style="min-height:40px" />
      </div>
      <div class="detail-block">
        <div class="detail-block-label">이름</div>
        <input type="text" class="note-input" id="new-admin-name" style="min-height:40px" />
      </div>
      <div class="detail-block">
        <div class="detail-block-label">비밀번호 (8자+)</div>
        <input type="password" class="note-input" id="new-admin-password" style="min-height:40px" />
      </div>
      <div class="detail-block">
        <div class="detail-block-label">역할</div>
        <select id="new-admin-role">
          ${ROLE_OPTIONS.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="btn btn-green" type="button" onclick="createAdminAccount()">계정 생성</button>
  `;
}

async function createAdminAccount() {
  const username = document.getElementById('new-admin-username')?.value?.trim();
  const name = document.getElementById('new-admin-name')?.value?.trim();
  const password = document.getElementById('new-admin-password')?.value || '';
  const role = document.getElementById('new-admin-role')?.value || 'moderator';
  try {
    await api('/accounts/accounts', {
      method: 'POST',
      body: JSON.stringify({ username, name, password, role }),
    });
    alert('관리자 계정이 생성되었습니다. OTP 등록이 필요합니다.');
    await loadAdminAccounts();
  } catch (e) {
    alert(e.message);
  }
}

async function editAdminAccount(id) {
  const acc = state.adminAccounts.find((a) => a.id === id);
  if (!acc) return;
  const role = prompt(
    `역할 변경 (${ROLE_OPTIONS.map((o) => o.value).join('/')})`,
    acc.role,
  );
  if (!role) return;
  const isDeleted = confirm('비활성화하시겠습니까? (취소=활성 유지)') ? true : acc.is_deleted;
  try {
    await api(`/accounts/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role, is_deleted: isDeleted }),
    });
    await loadAdminAccounts();
  } catch (e) {
    alert(e.message);
  }
}
