const LEGAL_DOC_OPTIONS = [
  { slug: 'terms_of_service', label: '서비스 이용약관' },
  { slug: 'privacy_policy', label: '개인정보 처리방침' },
  { slug: 'community_guide', label: '커뮤니티 가이드' },
  { slug: 'youth_protection_policy', label: '청소년 보호정책' },
  { slug: 'open_source_licenses', label: '오픈소스 라이선스' },
];

let selectedLegalSlug = 'terms_of_service';

function legalDocLabel(slug) {
  return LEGAL_DOC_OPTIONS.find((item) => item.slug === slug)?.label || slug;
}

async function loadLegalDocumentsPanel() {
  const host = document.getElementById('legal-documents-host');
  if (!host) return;

  host.innerHTML = `<div class="txt-muted">불러오는 중…</div>`;

  try {
    const { data } = await api('/legal');
    state.legalDocuments = data.documents || [];
    renderLegalDocumentsPanel();
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">문서 목록을 불러오지 못했습니다: ${esc(error.message)}</div>`;
  }
}

function renderLegalDocumentsPanel() {
  const host = document.getElementById('legal-documents-host');
  if (!host) return;

  const tabs = LEGAL_DOC_OPTIONS.map((item) => {
    const active = item.slug === selectedLegalSlug ? 'active' : '';
    return `<button type="button" class="btn btn-sm ${active}" onclick="selectLegalDocument('${item.slug}')">${esc(item.label)}</button>`;
  }).join('');

  host.innerHTML = `
    <div class="filter-row" style="margin-bottom:12px">${tabs}</div>
    <div id="legal-document-editor-host">
      <div class="txt-muted">문서를 불러오는 중…</div>
    </div>
  `;

  loadLegalDocumentEditor(selectedLegalSlug);
}

async function selectLegalDocument(slug) {
  selectedLegalSlug = slug;
  renderLegalDocumentsPanel();
}

function legalDocSchedule(updatedAt) {
  if (!updatedAt) return { enactedAt: '-', effectiveAt: '-' };
  const enactedAt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(new Date(updatedAt))
    .slice(0, 10);
  const ref = new Date(`${enactedAt}T12:00:00+09:00`);
  ref.setTime(ref.getTime() + 7 * 24 * 60 * 60 * 1000);
  const effectiveAt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(ref)
    .slice(0, 10);
  return { enactedAt, effectiveAt };
}

async function loadLegalDocumentEditor(slug) {
  const host = document.getElementById('legal-document-editor-host');
  if (!host) return;

  try {
    const { data } = await api(`/legal/${slug}`);
    const doc = data;
    const summary = state.legalDocuments.find((item) => item.slug === slug);
    const schedule = legalDocSchedule(doc.updatedAt || summary?.updatedAt);

    host.innerHTML = `
      <div class="detail-panel open">
        <div class="section-title">${esc(doc.title || legalDocLabel(slug))}</div>
        <p class="section-hint">제목·버전·제정일·시행일은 DB 필드에서 자동 표시됩니다. 본문에는 넣지 마세요.</p>
        <div class="form-grid" style="margin-top:12px">
          <label>버전
            <input id="legal-doc-version" class="note-input" value="${esc(doc.version || '')}" />
          </label>
          <label>제목 (앱 서브헤더)
            <input id="legal-doc-title" class="note-input" value="${esc(doc.title || '')}" />
          </label>
          <label>제정일 (마지막 수정일, KST)
            <input class="note-input" value="${esc(schedule.enactedAt)}" readonly />
          </label>
          <label>시행일 (제정일 +7일)
            <input class="note-input" value="${esc(schedule.effectiveAt)}" readonly />
          </label>
        </div>
        <label style="display:block;margin-top:12px">본문 (Markdown)
          <textarea id="legal-doc-content" class="note-input" style="min-height:420px;font-family:monospace">${esc(doc.contentMd || '')}</textarea>
        </label>
        <div class="txt-muted" style="margin-top:8px">
          마지막 수정: ${fmtDate(doc.updatedAt || summary?.updatedAt)}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button type="button" class="btn btn-primary" onclick="saveLegalDocument('${slug}')">저장</button>
          <button type="button" class="btn" onclick="loadLegalDocumentEditor('${slug}')">새로고침</button>
        </div>
        <div id="legal-revisions-host" style="margin-top:20px"></div>
      </div>
    `;

    await loadLegalDocumentRevisions(slug);
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">문서를 불러오지 못했습니다: ${esc(error.message)}</div>`;
  }
}

async function loadLegalDocumentRevisions(slug) {
  const host = document.getElementById('legal-revisions-host');
  if (!host) return;

  try {
    const { data } = await api(`/legal/${slug}/revisions?limit=20`);
    const revisions = data.revisions || [];
    if (!revisions.length) {
      host.innerHTML = `
        <div class="section-title" style="margin-top:8px">변경 이력</div>
        <p class="section-hint">아직 저장 이력이 없습니다. 내용이 바뀔 때 이전 버전이 자동 보관됩니다.</p>
      `;
      return;
    }

    const rows = revisions.map((rev) => `
      <tr>
        <td>#${rev.id}</td>
        <td>${esc(rev.version)}</td>
        <td class="txt-muted">${fmtDate(rev.archivedAt)}</td>
        <td>
          <button type="button" class="btn btn-sm" onclick="previewLegalRevision('${slug}', ${rev.id})">보기</button>
        </td>
      </tr>
    `).join('');

    host.innerHTML = `
      <div class="section-title" style="margin-top:8px">변경 이력</div>
      <p class="section-hint">저장 시 변경 전 본문이 자동 보관됩니다. 분쟁 대비용 조회 전용입니다.</p>
      <div class="table-wrap" style="margin-top:8px">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>버전</th><th>보관 시각</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (error) {
    host.innerHTML = `<p class="txt-muted">이력을 불러오지 못했습니다: ${esc(error.message)}</p>`;
  }
}

async function previewLegalRevision(slug, revisionId) {
  try {
    const { data } = await api(`/legal/${slug}/revisions/${revisionId}`);
    const rev = data;
    const titleEl = document.getElementById('legal-doc-title');
    const versionEl = document.getElementById('legal-doc-version');
    const contentEl = document.getElementById('legal-doc-content');
    if (!contentEl) return;
    if (titleEl) titleEl.value = rev.title || '';
    if (versionEl) versionEl.value = rev.version || '';
    contentEl.value = rev.contentMd || '';
    alert(`이력 #${revisionId} (${rev.version})을 편집창에 불러왔습니다. 그대로 두면 저장 시 새 버전으로 덮어씁니다.`);
  } catch (error) {
    alert(`이력 조회 실패: ${error.message}`);
  }
}

async function saveLegalDocument(slug) {
  const titleValue = document.getElementById('legal-doc-title')?.value?.trim();
  const version = document.getElementById('legal-doc-version')?.value?.trim();
  const contentMd = document.getElementById('legal-doc-content')?.value?.trim();

  if (!titleValue || !version || !contentMd) {
    alert('제목, 버전, 본문을 모두 입력해 주세요.');
    return;
  }

  try {
    await api(`/legal/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: titleValue,
        version,
        contentMd,
      }),
    });
    alert('저장되었습니다. 앱에서 새로고침하면 반영됩니다.');
    await loadLegalDocumentsPanel();
    selectedLegalSlug = slug;
    await loadLegalDocumentEditor(slug);
  } catch (error) {
    alert(`저장 실패: ${error.message}`);
  }
}

window.selectLegalDocument = selectLegalDocument;
window.loadLegalDocumentEditor = loadLegalDocumentEditor;
window.saveLegalDocument = saveLegalDocument;
window.previewLegalRevision = previewLegalRevision;
window.loadLegalDocuments = loadLegalDocumentsPanel;
