const FLAG_LABELS = {
  signup_disabled: '회원가입 중단',
  post_write_disabled: '게시글 작성 중단',
  comment_write_disabled: '댓글 작성 중단',
  report_submission_disabled: '신고 접수 중단',
  global_readonly: '전역 읽기 전용',
  rate_limit_strict_mode: 'API 제한 강화',
};

async function loadEmergencyFlags() {
  const host = document.getElementById('emergency-flags-host');
  if (!host) return;
  host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
  const { data } = await api('/system/flags');
  state.emergencyFlags = data;

  const toggles = Object.keys(FLAG_LABELS)
    .map(
      (key) => `
    <label class="flag-row">
      <input type="checkbox" data-flag-key="${key}" ${data[key] ? 'checked' : ''} />
      <span>${FLAG_LABELS[key]}</span>
    </label>
  `,
    )
    .join('');

  host.innerHTML = `
    <div class="flag-grid">${toggles}</div>
    <div class="section-title" style="margin-top:16px">잠긴 학교 ID (쉼표 구분)</div>
    <input type="text" class="note-input" id="emergency-locked-schools" style="min-height:40px"
      value="${esc((data.locked_school_ids || []).join(', '))}" placeholder="예: 101, 205" />
    <div class="section-title" style="margin-top:16px">사용자 안내 메시지</div>
    <textarea class="note-input" id="emergency-maintenance-message" placeholder="제한 시 앱에 표시할 메시지">${esc(data.maintenance_message || '')}</textarea>
    <div class="section-title" style="margin-top:16px">변경 사유 (필수)</div>
    <input type="text" class="note-input" id="emergency-change-note" style="min-height:40px" placeholder="예: 신고 폭탄 대응" />
    <div class="section-title" style="margin-top:16px">OTP 확인 (6자리)</div>
    <input type="text" class="note-input" id="emergency-confirm-otp" style="min-height:40px" inputmode="numeric" maxlength="6" placeholder="000000" />
    <div class="action-row">
      <button class="btn btn-red" type="button" onclick="saveEmergencyFlags()">비상 스위치 적용</button>
    </div>
    <p class="section-hint">모든 변경은 감사 로그에 기록됩니다. 최고관리자 + OTP 확인이 필요합니다.</p>
  `;
}

async function saveEmergencyFlags() {
  const note = document.getElementById('emergency-change-note')?.value?.trim();
  const confirmOtp = document.getElementById('emergency-confirm-otp')?.value?.trim();
  if (!note) {
    alert('변경 사유를 입력해 주세요.');
    return;
  }
  if (!confirmOtp || confirmOtp.length !== 6) {
    alert('OTP 6자리를 입력해 주세요.');
    return;
  }

  const flags = {};
  document.querySelectorAll('[data-flag-key]').forEach((el) => {
    flags[el.getAttribute('data-flag-key')] = el.checked;
  });

  const lockedRaw = document.getElementById('emergency-locked-schools')?.value || '';
  flags.locked_school_ids = lockedRaw
    .split(/[,\s]+/)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  flags.maintenance_message =
    document.getElementById('emergency-maintenance-message')?.value?.trim() || '';

  try {
    await api('/system/flags', {
      method: 'PATCH',
      body: JSON.stringify({ flags, note, confirmOtp }),
    });
    alert('비상 스위치가 적용되었습니다.');
    await loadEmergencyFlags();
  } catch (e) {
    alert(e.message);
  }
}
