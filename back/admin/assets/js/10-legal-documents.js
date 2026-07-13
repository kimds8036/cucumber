const LEGAL_DOC_OPTIONS = [
  { slug: 'terms_of_service', label: '서비스 이용약관' },
  { slug: 'privacy_policy', label: '개인정보 처리방침' },
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

async function loadLegalDocumentEditor(slug) {
  const host = document.getElementById('legal-document-editor-host');
  if (!host) return;

  try {
    const { data } = await api(`/legal/${slug}`);
    const doc = data;
    const summary = state.legalDocuments.find((item) => item.slug === slug);

    host.innerHTML = `
      <div class="detail-panel">
        <div class="section-title">${esc(doc.title || legalDocLabel(slug))}</div>
        <p class="section-hint">마크다운 형식으로 작성합니다. 저장 즉시 앱에서 조회됩니다.</p>
        <div class="form-grid" style="margin-top:12px">
          <label>버전
            <input id="legal-doc-version" class="note-input" value="${esc(doc.version || '')}" />
          </label>
          <label>제목
            <input id="legal-doc-title" class="note-input" value="${esc(doc.title || '')}" />
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
      </div>
    `;
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">문서를 불러오지 못했습니다: ${esc(error.message)}</div>`;
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
window.loadLegalDocuments = loadLegalDocumentsPanel;
