async function loadStudentIds() {
    const status = document.getElementById('student-id-filter')?.value || 'pending';
    const q = document.getElementById('student-id-search-q')?.value?.trim() || '';
    const host = document.getElementById('student-id-list');
    if (!host) return;
    host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
    try {
      const qs = new URLSearchParams();
      qs.set('status', status);
      qs.set('purpose', 'signup');
      qs.set('limit', '50');
      if (q) qs.set('q', q);
      const { data } = await api(`/signup-student-ids?${qs.toString()}`);
      state.studentIdSubmissions = data.submissions || [];
      renderStudentIds();
      if (status === 'pending') {
        setNavBadge('badge-student-ids', state.studentIdSubmissions.length);
      }
    } catch (e) {
      host.innerHTML = `<p class="txt-danger">${esc(e.message)}</p>`;
    }
  }

  async function loadReverificationIds() {
    const status = document.getElementById('reverification-id-filter')?.value || 'pending';
    const q = document.getElementById('reverification-id-search-q')?.value?.trim() || '';
    const host = document.getElementById('reverification-id-list');
    if (!host) return;
    host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
    try {
      const qs = new URLSearchParams();
      qs.set('status', status);
      qs.set('purpose', 'reverification');
      qs.set('limit', '50');
      if (q) qs.set('q', q);
      const { data } = await api(`/signup-student-ids?${qs.toString()}`);
      state.reverificationIdSubmissions = data.submissions || [];
      renderReverificationIds();
      if (status === 'pending') {
        setNavBadge('badge-reverification-ids', state.reverificationIdSubmissions.length);
      }
    } catch (e) {
      host.innerHTML = `<p class="txt-danger">${esc(e.message)}</p>`;
    }
  }

  function renderStudentIdCard(s, listKind) {
    const addr = [s.school_region, s.school_address].filter(Boolean).join(' · ');
    const statusClass = statusPill(s.status);
    const statusLower = String(s.status).toLowerCase();
    const canReview = statusLower === 'pending';
    const canReapprove = statusLower === 'rejected' && !s.student_verified;
    const verifiedBadge = s.student_verified
      ? '<span class="pill pill-resolved" style="margin-left:6px;">학생인증 완료</span>'
      : '<span class="pill pill-pending" style="margin-left:6px;">학생인증 미완료</span>';
    const gradeLine = [
      s.user_grade != null ? `${s.user_grade}학년` : null,
      s.user_class_number != null ? `${s.user_class_number}반` : null,
      s.user_school_id ? null : '계정 학교 미설정',
    ].filter(Boolean).join(' · ');
    const guardianBadge = s.has_guardian_consent
      ? '<span class="pill pill-resolved" style="margin-left:6px;">보호자 동의</span>'
      : '';
    return `
        <div class="user-card" style="margin-bottom:12px;">
          <div class="user-card-header">
            <div>
              <div class="user-name">${esc(s.name || '-')} <span class="txt-muted">(@${esc(s.username)} · UID #${esc(s.user_id)})</span>
                <span class="pill" style="margin-left:6px;">${esc(purposeLabel(s.submission_purpose))}</span>
                ${verifiedBadge}
                ${guardianBadge}
              </div>
              <div class="user-sub">${esc(s.school_name || '-')} ${addr ? `· ${esc(addr)}` : ''}${gradeLine ? ` · ${esc(gradeLine)}` : ''}</div>
              ${renderSchoolTransition(s)}
              <div class="user-sub">생년월일: ${esc(s.birth_date || '-')} · 전화: ${esc(s.phone || '-')} · 제출: ${fmtDate(s.created_at)}${s.reviewed_at ? ` · 검수: ${fmtDate(s.reviewed_at)}` : ''}${listKind === 'reverification' ? ` · 재인증: ${esc(s.reverification_status || '-')}` : ''}</div>
            </div>
            <span class="pill ${statusClass}">${esc(statusLabel(s.status))}</span>
          </div>
          <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;padding:14px 16px;">
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${(function () {
                let urls = [];
                try {
                  if (String(s.cloudinary_url || '').trim().startsWith('{')) {
                    const j = JSON.parse(s.cloudinary_url);
                    urls = [j.primary, j.secondary].filter(Boolean);
                  } else if (s.cloudinary_url) {
                    urls = [s.cloudinary_url];
                  }
                } catch {
                  if (s.cloudinary_url) urls = [s.cloudinary_url];
                }
                if (!urls.length) {
                  return '<p class="txt-muted">이미지 없음</p>';
                }
                return urls
                  .map(
                    (url, i) => `
                  <a href="${esc(url)}" target="_blank" rel="noopener">
                    <img src="${esc(url)}" alt="학생증 ${i + 1}" style="width:100%;max-width:220px;border-radius:8px;border:0.5px solid var(--border);" />
                  </a>`,
                  )
                  .join('');
              })()}
            </div>
            <div>
              ${s.review_note ? `<p class="txt-muted" style="margin-bottom:8px;white-space:pre-wrap;">메모: ${esc(s.review_note)}</p>` : ''}
              ${canReview ? `
                <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
                  <button class="btn btn-sm btn-primary" onclick="approveStudentId(${s.id}, '${listKind}')">승인</button>
                  <button class="btn btn-sm btn-danger" onclick="openStudentIdRejectDialog(${s.id}, '${listKind}')">거절</button>
                </div>
              ` : ''}
              ${canReapprove ? `
                <div style="margin-top:12px;padding:10px 12px;border:0.5px solid var(--border);border-radius:8px;background:var(--surface-2, #f7f6f3);">
                  <p class="txt-muted" style="margin:0 0 8px;font-size:12px;line-height:1.45;">
                    문의·이메일 등으로 학적이 확인된 경우, 거절 이력을 유지한 채 학생 인증을 완료할 수 있습니다.
                  </p>
                  <button class="btn btn-sm btn-primary" onclick="reapproveStudentId(${s.id}, '${listKind}')">거절 후 승인(재승인)</button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
  }

  function renderStudentIds() {
    const host = document.getElementById('student-id-list');
    if (!state.studentIdSubmissions.length) {
      host.innerHTML = '<p class="txt-muted">표시할 학생증 제출 건이 없습니다.</p>';
      return;
    }
    host.innerHTML = state.studentIdSubmissions.map((s) => renderStudentIdCard(s, 'signup')).join('');
  }

  function renderReverificationIds() {
    const host = document.getElementById('reverification-id-list');
    if (!state.reverificationIdSubmissions.length) {
      host.innerHTML = '<p class="txt-muted">표시할 재인증 제출 건이 없습니다.</p>';
      return;
    }
    host.innerHTML = state.reverificationIdSubmissions.map((s) => renderStudentIdCard(s, 'reverification')).join('');
  }

  let pendingStudentIdRejectListKind = 'signup';
  let pendingStudentIdRejectRegisteredName = '';
  let pendingStudentIdRejectSchoolName = '';

  function findStudentIdSubmission(id, listKind) {
    const list =
      listKind === 'reverification'
        ? state.reverificationIdSubmissions
        : state.studentIdSubmissions;
    return (list || []).find((s) => Number(s.id) === Number(id)) || null;
  }

  function buildNameMismatchRejectNote(registeredName, studentIdName) {
    const registered = String(registeredName || '').trim() || '-';
    const idName = String(studentIdName || '').trim() || '(미입력)';
    return [
      '안녕하세요. 계정 정보와 학생증 사진의 이름이 다르게 등록되어 안내해 드립니다.',
      `등록된 이름: ${registered}`,
      `학생증 이름: ${idName}`,
      '내용 확인 후 정확한 정보로 재인증 부탁드립니다. 감사합니다.',
    ].join('\n');
  }

  function buildStudentIdRejectNote(kind) {
    if (kind === 'blurry') {
      return [
        '안녕하세요. 제출해 주신 학생증 사진을 확인했으나, 글자나 사진이 흐리거나 일부가 잘려 정보를 정확히 확인하기 어려워 안내드립니다.',
        '이름·학교·사진이 선명하게 보이도록 전체를 다시 촬영해 재인증 부탁드립니다. 감사합니다.',
      ].join('\n');
    }
    if (kind === 'school_mismatch') {
      const school = String(pendingStudentIdRejectSchoolName || '').trim() || '-';
      return [
        '안녕하세요. 계정에 등록된 학교 정보와 학생증 사진의 학교 정보가 다르게 확인되어 안내드립니다.',
        `등록된 학교: ${school}`,
        '내용 확인 후 정확한 학교 정보로 재인증 부탁드립니다. 감사합니다.',
      ].join('\n');
    }
    if (kind === 'not_student_id') {
      return [
        '안녕하세요. 제출해 주신 사진을 확인했으나 학생증으로 보기 어려워 안내드립니다.',
        '본인 명의의 학생증이 잘 보이도록 다시 촬영해 재인증 부탁드립니다. 감사합니다.',
      ].join('\n');
    }
    if (kind === 'name_mismatch') {
      const input = document.getElementById('student-id-reject-id-name');
      return buildNameMismatchRejectNote(
        pendingStudentIdRejectRegisteredName,
        input?.value || '',
      );
    }
    return '';
  }

  function updateStudentIdRejectPreview() {
    const preview = document.getElementById('student-id-reject-preview');
    const sel = document.getElementById('student-id-reject-reason')?.value;
    if (!preview) return;
    if (!sel || sel === 'custom') {
      preview.style.display = 'none';
      preview.textContent = '';
      return;
    }
    preview.style.display = 'block';
    preview.textContent = buildStudentIdRejectNote(sel);
  }

  function syncStudentIdRejectFields() {
    const sel = document.getElementById('student-id-reject-reason')?.value;
    const custom = document.getElementById('student-id-reject-custom');
    const nameWrap = document.getElementById('student-id-reject-name-wrap');
    if (custom) custom.style.display = sel === 'custom' ? 'block' : 'none';
    if (nameWrap) nameWrap.style.display = sel === 'name_mismatch' ? 'block' : 'none';
    updateStudentIdRejectPreview();
  }

  async function approveStudentId(id, listKind = 'signup') {
    if (!confirm('이 학생증을 승인하시겠습니까?')) return;
    try {
      await api(`/signup-student-ids/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      });
      if (listKind === 'reverification') await loadReverificationIds();
      else await loadStudentIds();
      alert('승인되었습니다.');
    } catch (e) {
      alert(e.message);
    }
  }

  async function reapproveStudentId(id, listKind = 'signup') {
    const note = prompt(
      '재승인 사유를 입력하세요 (문의·이메일 학적 확인 등).\n비워 두면 기본 문구가 저장됩니다.',
      '문의하기 학적 확인 후 거절 건 재승인',
    );
    if (note === null) return;
    if (!confirm('거절되었던 학생증을 재승인할까요?\n학생 인증이 완료되고 학교·학생 기능이 해금됩니다.')) {
      return;
    }
    try {
      const body = { status: 'approved' };
      if (String(note).trim()) body.reviewNote = String(note).trim();
      await api(`/signup-student-ids/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (listKind === 'reverification') await loadReverificationIds();
      else await loadStudentIds();
      alert('재승인되었습니다. 학생 인증이 완료되었습니다.');
    } catch (e) {
      alert(e.message);
    }
  }

  function openStudentIdRejectDialog(id, listKind = 'signup') {
    pendingStudentIdRejectId = id;
    pendingStudentIdRejectListKind = listKind;
    const submission = findStudentIdSubmission(id, listKind);
    pendingStudentIdRejectRegisteredName = String(submission?.name || '').trim();
    pendingStudentIdRejectSchoolName = String(submission?.school_name || '').trim();
    document.getElementById('student-id-reject-reason').value = STUDENT_ID_REJECT_PRESET[0];
    document.getElementById('student-id-reject-custom').value = '';
    const idNameInput = document.getElementById('student-id-reject-id-name');
    if (idNameInput) idNameInput.value = '';
    const registeredEl = document.getElementById('student-id-reject-registered-name');
    if (registeredEl) {
      registeredEl.textContent = pendingStudentIdRejectRegisteredName || '-';
    }
    syncStudentIdRejectFields();
    document.getElementById('student-id-reject-dialog').classList.add('show');
  }

  function closeStudentIdRejectDialog() {
    pendingStudentIdRejectId = null;
    document.getElementById('student-id-reject-dialog').classList.remove('show');
  }

  function closeStudentIdRejectByBackdrop(e) {
    if (e.target.id === 'student-id-reject-dialog') closeStudentIdRejectDialog();
  }

  document.getElementById('student-id-reject-reason')?.addEventListener('change', syncStudentIdRejectFields);
  document.getElementById('student-id-reject-id-name')?.addEventListener('input', updateStudentIdRejectPreview);

  async function submitStudentIdReject() {
    if (!pendingStudentIdRejectId) return;
    const sel = document.getElementById('student-id-reject-reason').value;
    let note = '';
    if (sel === 'custom') {
      note = document.getElementById('student-id-reject-custom').value.trim();
      if (!note) {
        alert('거절 사유를 입력해 주세요.');
        return;
      }
    } else if (sel === 'name_mismatch') {
      const idName = document.getElementById('student-id-reject-id-name')?.value.trim() || '';
      if (!idName) {
        alert('학생증에 적힌 이름을 입력해 주세요.');
        return;
      }
      note = buildNameMismatchRejectNote(pendingStudentIdRejectRegisteredName, idName);
    } else {
      note = buildStudentIdRejectNote(sel);
      if (!note) {
        alert('거절 사유를 선택해 주세요.');
        return;
      }
    }
    try {
      await api(`/signup-student-ids/${pendingStudentIdRejectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', reviewNote: note }),
      });
      closeStudentIdRejectDialog();
      if (pendingStudentIdRejectListKind === 'reverification') await loadReverificationIds();
      else await loadStudentIds();
      alert('거절 처리되었습니다.');
    } catch (e) {
      alert(e.message);
    }
  }
