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
    return `
        <div class="user-card" style="margin-bottom:12px;">
          <div class="user-card-header">
            <div>
              <div class="user-name">${esc(s.name || '-')} <span class="txt-muted">(@${esc(s.username)} · UID #${esc(s.user_id)})</span>
                <span class="pill" style="margin-left:6px;">${esc(purposeLabel(s.submission_purpose))}</span>
                ${verifiedBadge}
              </div>
              <div class="user-sub">${esc(s.school_name || '-')} ${addr ? `· ${esc(addr)}` : ''}</div>
              ${renderSchoolTransition(s)}
              <div class="user-sub">전화: ${esc(s.phone || '-')} · 제출: ${fmtDate(s.created_at)}${s.reviewed_at ? ` · 검수: ${fmtDate(s.reviewed_at)}` : ''}${listKind === 'reverification' ? ` · 재인증: ${esc(s.reverification_status || '-')}` : ''}</div>
            </div>
            <span class="pill ${statusClass}">${esc(statusLabel(s.status))}</span>
          </div>
          <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;padding:14px 16px;">
            <a href="${esc(s.cloudinary_url)}" target="_blank" rel="noopener">
              <img src="${esc(s.cloudinary_url)}" alt="학생증" style="width:100%;max-width:220px;border-radius:8px;border:0.5px solid var(--border);" />
            </a>
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
                    문의·이메일 등으로 학적이 확인된 경우, 거절 이력을 유지한 채 앱 이용을 열어줄 수 있습니다.
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
      host.innerHTML = '<p class="txt-muted">표시할 가입 학생증 제출 건이 없습니다.</p>';
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
    if (!confirm('거절되었던 학생증을 재승인할까요?\n사용자 student_verified가 켜지고 앱을 이용할 수 있게 됩니다.')) {
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
      alert('재승인되었습니다. 사용자가 앱을 이용할 수 있습니다.');
    } catch (e) {
      alert(e.message);
    }
  }

  function openStudentIdRejectDialog(id, listKind = 'signup') {
    pendingStudentIdRejectId = id;
    pendingStudentIdRejectListKind = listKind;
    document.getElementById('student-id-reject-reason').value = STUDENT_ID_REJECT_PRESET[0];
    document.getElementById('student-id-reject-custom').value = '';
    document.getElementById('student-id-reject-custom').style.display = 'none';
    document.getElementById('student-id-reject-dialog').classList.add('show');
  }

  function closeStudentIdRejectDialog() {
    pendingStudentIdRejectId = null;
    document.getElementById('student-id-reject-dialog').classList.remove('show');
  }

  function closeStudentIdRejectByBackdrop(e) {
    if (e.target.id === 'student-id-reject-dialog') closeStudentIdRejectDialog();
  }

  document.getElementById('student-id-reject-reason')?.addEventListener('change', (e) => {
    const custom = document.getElementById('student-id-reject-custom');
    custom.style.display = e.target.value === 'custom' ? 'block' : 'none';
  });

  async function submitStudentIdReject() {
    if (!pendingStudentIdRejectId) return;
    const sel = document.getElementById('student-id-reject-reason').value;
    let note = sel;
    if (sel === 'custom') {
      note = document.getElementById('student-id-reject-custom').value.trim();
      if (!note) {
        alert('거절 사유를 입력해 주세요.');
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
