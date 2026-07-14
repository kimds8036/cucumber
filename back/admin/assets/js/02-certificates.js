async function loadCertificates() {
  const status = document.getElementById('certificate-filter')?.value || 'pending';
  const host = document.getElementById('certificate-list');
  if (!host) return;
  host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
  try {
    const { data } = await api(
      `/signup-certificates?status=${encodeURIComponent(status)}&limit=50`,
    );
    state.certificateSubmissions = data.submissions || [];
    renderCertificates();
    if (status === 'pending') {
      setNavBadge('badge-certificates', state.certificateSubmissions.length);
    }
  } catch (e) {
    host.innerHTML = `<p class="txt-danger">${esc(e.message)}</p>`;
  }
}

function renderCertificateCard(s) {
  const statusClass = statusPill(s.status);
  const canReview = String(s.status).toLowerCase() === 'pending';
  const viewUrl = esc(s.certificate_view_url || '');
  const accessCode = esc(s.certificate_access_code || '');
  return `
    <div class="user-card" style="margin-bottom:12px;">
      <div class="user-card-header">
        <div>
          <div class="user-name">${esc(s.name || '-')} <span class="txt-muted">(@${esc(s.username)})</span></div>
          <div class="user-sub">기재 학교: ${esc(s.claimed_school_name || '-')} · 생년월일: ${esc(s.birth_date || '-')}</div>
          <div class="user-sub">전화: ${esc(s.phone || '-')} · 제출: ${fmtDate(s.created_at)}</div>
        </div>
        <span class="pill ${statusClass}">${esc(statusLabel(s.status))}</span>
      </div>
      <div style="padding:14px 16px;">
        <div style="margin-bottom:10px;">
          <div class="txt-muted" style="font-size:12px;margin-bottom:4px;">열람용 주소</div>
          <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" style="word-break:break-all;">${viewUrl}</a>
        </div>
        <div style="margin-bottom:10px;">
          <div class="txt-muted" style="font-size:12px;margin-bottom:4px;">열람 번호</div>
          <code style="font-size:14px;">${accessCode}</code>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <a class="btn btn-sm" href="${viewUrl}" target="_blank" rel="noopener noreferrer">증명서 열기</a>
          <button type="button" class="btn btn-sm" onclick="copyCertificateAccess('${accessCode.replace(/'/g, "\\'")}')">열람번호 복사</button>
        </div>
        ${s.review_note ? `<p class="txt-muted" style="margin-bottom:8px;">메모: ${esc(s.review_note)}</p>` : ''}
        ${canReview ? `
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="cert-school-${s.id}" placeholder="승인 시 학교 ID (선택)" style="height:32px;padding:0 8px;min-width:180px;" />
            <button class="btn btn-sm btn-primary" onclick="approveCertificate(${s.id})">승인</button>
            <button class="btn btn-sm btn-danger" onclick="openCertificateRejectDialog(${s.id})">거절</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderCertificates() {
  const host = document.getElementById('certificate-list');
  if (!state.certificateSubmissions.length) {
    host.innerHTML = '<p class="txt-muted">표시할 재학증명서 제출 건이 없습니다.</p>';
    return;
  }
  host.innerHTML = state.certificateSubmissions
    .map((s) => renderCertificateCard(s))
    .join('');
}

function copyCertificateAccess(code) {
  const text = String(code || '');
  if (!text) return;
  navigator.clipboard?.writeText(text).then(
    () => alert('열람 번호를 복사했습니다.'),
    () => alert(text),
  );
}

async function approveCertificate(id) {
  if (!confirm('이 재학증명서를 승인하시겠습니까?')) return;
  const schoolInput = document.getElementById(`cert-school-${id}`);
  const schoolId = schoolInput?.value?.trim() || '';
  try {
    await api(`/signup-certificates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'approved',
        ...(schoolId ? { schoolId } : {}),
      }),
    });
    await loadCertificates();
    alert('승인되었습니다.');
  } catch (e) {
    alert(e.message);
  }
}

let pendingCertificateRejectId = null;

function openCertificateRejectDialog(id) {
  pendingCertificateRejectId = id;
  document.getElementById('certificate-reject-note').value = '';
  document.getElementById('certificate-reject-dialog').classList.add('show');
}

function closeCertificateRejectDialog() {
  pendingCertificateRejectId = null;
  document.getElementById('certificate-reject-dialog').classList.remove('show');
}

function closeCertificateRejectByBackdrop(e) {
  if (e.target.id === 'certificate-reject-dialog') closeCertificateRejectDialog();
}

async function submitCertificateReject() {
  if (!pendingCertificateRejectId) return;
  const note = document.getElementById('certificate-reject-note').value.trim();
  if (!note) {
    alert('거절 사유를 입력해 주세요.');
    return;
  }
  try {
    await api(`/signup-certificates/${pendingCertificateRejectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected', reviewNote: note }),
    });
    closeCertificateRejectDialog();
    await loadCertificates();
    alert('거절 처리되었습니다.');
  } catch (e) {
    alert(e.message);
  }
}
