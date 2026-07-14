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

/* ── 앱 PolicyMarkdownBody 와 동일 규칙의마크다운 블록 파서 ── */
const LEGAL_TABLE_SEPARATOR = /^\|(\s*:?-+:?\s*\|)+$/;

function legalIsTableSeparator(line) {
  return LEGAL_TABLE_SEPARATOR.test(String(line || '').trim());
}

function legalParseTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function legalCollectTableRows(lines, startIndex) {
  const rows = [];
  let i = startIndex;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|')) break;
    if (legalIsTableSeparator(trimmed)) {
      i += 1;
      continue;
    }
    rows.push(legalParseTableRow(lines[i]));
    i += 1;
  }
  return { rows, nextIndex: i };
}

function legalIsTableHeaderRow(row) {
  if (!row?.length) return false;
  const first = row[0].replace(/\*\*/g, '').trim();
  return ['구분', '항목', '수탁자'].includes(first);
}

function legalTableRowsToBulletLines(rows) {
  const dataRows =
    rows.length > 1 && legalIsTableHeaderRow(rows[0]) ? rows.slice(1) : rows;
  return dataRows.map((row) => {
    const cols = row.filter((cell) => cell !== undefined && cell !== '');
    if (cols.length >= 3) {
      return `${cols[0]}: ${cols[1]}. 보유 및 이용 기간: ${cols[2]}`;
    }
    if (cols.length === 2) {
      return `${cols[0]}: ${cols[1]}`;
    }
    return cols.join(', ');
  });
}

function legalGroupMarkdownBlocks(markdown) {
  const lines = String(markdown || '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (legalIsTableSeparator(trimmed)) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('|')) {
      const { rows, nextIndex } = legalCollectTableRows(lines, i);
      legalTableRowsToBulletLines(rows).forEach((bulletLine) => {
        blocks.push({ type: 'bullet', trimmed: bulletLine });
      });
      i = nextIndex;
      continue;
    }
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length) {
        const q = lines[i].trim();
        if (!q.startsWith('>')) break;
        const inner = q.replace(/^>\s?/, '').trim();
        if (inner) quoteLines.push(inner);
        i += 1;
      }
      if (quoteLines.length > 0) {
        blocks.push({ type: 'blockquote', trimmed: quoteLines.join('\n') });
      }
      continue;
    }
    if (/^-\s+/.test(line)) {
      const indent = (line.match(/^\s*/) || [''])[0].length;
      blocks.push({
        type: indent >= 4 ? 'bulletNested' : 'bullet',
        trimmed: trimmed.replace(/^-\s+/, ''),
      });
      i += 1;
      continue;
    }
    blocks.push({ type: 'line', trimmed });
    i += 1;
  }
  return blocks;
}

function legalRenderInlineHtml(text) {
  let s = esc(String(text || ''));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a class="legal-app-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return s;
}

function legalRenderAppPreviewHtml({ title, version, enactedAt, effectiveAt, contentMd }) {
  const headerTitle = title || '약관·방침';
  const metaParts = [];
  if (enactedAt && enactedAt !== '-') {
    metaParts.push(
      `<p class="legal-app-meta-line"><span class="legal-app-meta-label">제정일</span>: [${esc(enactedAt)}]</p>`,
    );
  }
  if (effectiveAt && effectiveAt !== '-') {
    metaParts.push(
      `<p class="legal-app-meta-line"><span class="legal-app-meta-label">시행일</span>: [${esc(effectiveAt)}]</p>`,
    );
  }
  if (version) {
    metaParts.push(
      `<p class="legal-app-meta-line"><span class="legal-app-meta-label">버전</span>: ${esc(version)}</p>`,
    );
  }

  const blocks = legalGroupMarkdownBlocks(contentMd);
  const body = blocks
    .map((block) => {
      const { trimmed, type } = block;
      if (trimmed === '---') {
        return '<div class="legal-app-divider"></div>';
      }
      if (trimmed.startsWith('## ')) {
        return `<div class="legal-app-chapter">${legalRenderInlineHtml(trimmed.replace(/^##\s+/, ''))}</div>`;
      }
      if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
        return `<div class="legal-app-section">${legalRenderInlineHtml(trimmed.replace(/^#{3,4}\s+/, ''))}</div>`;
      }
      if (type === 'blockquote') {
        return `<div class="legal-app-quote">${legalRenderInlineHtml(trimmed)}</div>`;
      }
      if (type === 'bullet') {
        return `<div class="legal-app-bullet">• ${legalRenderInlineHtml(trimmed)}</div>`;
      }
      if (type === 'bulletNested') {
        return `<div class="legal-app-bullet-nested">• ${legalRenderInlineHtml(trimmed)}</div>`;
      }
      return `<div class="legal-app-para">${legalRenderInlineHtml(trimmed)}</div>`;
    })
    .join('');

  return `
    <div class="legal-phone-frame">
      <div class="legal-phone-notch" aria-hidden="true"></div>
      <div class="legal-phone-screen">
        <div class="legal-phone-subheader">${esc(headerTitle)}</div>
        <div class="legal-phone-body">
          ${
            metaParts.length
              ? `<div class="legal-app-meta">${metaParts.join('')}<div class="legal-app-divider"></div></div>`
              : ''
          }
          ${body || '<p class="txt-muted">본문이 비어 있습니다.</p>'}
        </div>
      </div>
    </div>
  `;
}

function refreshLegalAppPreview(fallbackSchedule) {
  const host = document.getElementById('legal-app-preview');
  if (!host) return;
  const title = document.getElementById('legal-doc-title')?.value?.trim() || '';
  const version = document.getElementById('legal-doc-version')?.value?.trim() || '';
  const contentMd = document.getElementById('legal-doc-content')?.value || '';
  const enactedAt =
    document.getElementById('legal-doc-enacted')?.value ||
    fallbackSchedule?.enactedAt ||
    '-';
  const effectiveAt =
    document.getElementById('legal-doc-effective')?.value ||
    fallbackSchedule?.effectiveAt ||
    '-';
  host.innerHTML = legalRenderAppPreviewHtml({
    title,
    version,
    enactedAt,
    effectiveAt,
    contentMd,
  });
}

function bindLegalPreviewInputs(schedule) {
  const ids = ['legal-doc-title', 'legal-doc-version', 'legal-doc-content'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.previewBound === '1') return;
    el.dataset.previewBound = '1';
    el.addEventListener('input', () => refreshLegalAppPreview(schedule));
  });
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
        <p class="section-hint">왼쪽에서 Markdown을 편집하면, 오른쪽 미리보기는 앱과 같은 규칙으로 렌더링됩니다. (표→글머리, ##/###, 링크·굵게)</p>
        <div class="form-grid" style="margin-top:12px">
          <label>버전
            <input id="legal-doc-version" class="note-input" value="${esc(doc.version || '')}" />
          </label>
          <label>제목 (앱 서브헤더)
            <input id="legal-doc-title" class="note-input" value="${esc(doc.title || '')}" />
          </label>
          <label>제정일 (마지막 수정일, KST)
            <input id="legal-doc-enacted" class="note-input" value="${esc(schedule.enactedAt)}" readonly />
          </label>
          <label>시행일 (제정일 +7일)
            <input id="legal-doc-effective" class="note-input" value="${esc(schedule.effectiveAt)}" readonly />
          </label>
        </div>
        <div class="legal-editor-layout">
          <div class="legal-editor-pane">
            <label>본문 (Markdown)
              <textarea id="legal-doc-content" class="note-input" style="min-height:420px;font-family:monospace;margin-top:6px">${esc(doc.contentMd || '')}</textarea>
            </label>
          </div>
          <div class="legal-preview-pane">
            <div class="legal-preview-label">앱 화면 미리보기</div>
            <div id="legal-app-preview"></div>
          </div>
        </div>
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

    refreshLegalAppPreview(schedule);
    bindLegalPreviewInputs(schedule);
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
    refreshLegalAppPreview();
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
window.refreshLegalAppPreview = refreshLegalAppPreview;
