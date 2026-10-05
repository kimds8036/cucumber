let recommendedHashtagItems = [];
let usedHashtagOptions = [];

function escapeHashtagText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRecommendedHashtags() {
  const host = document.getElementById('recommended-hashtags-host');
  if (!host) return;
  const usedOptions = usedHashtagOptions
    .map(
      (item) =>
        `<option value="${escapeHashtagText(item.name)}">${escapeHashtagText(item.name)} (${item.useCount})</option>`,
    )
    .join('');
  const rows = recommendedHashtagItems
    .map(
      (item) => `
        <tr>
          <td>#${escapeHashtagText(item.name)}</td>
          <td style="width:88px;text-align:right">
            <button type="button" class="btn btn-sm btn-danger" data-rh-delete="${item.id}">삭제</button>
          </td>
        </tr>`,
    )
    .join('');
  host.innerHTML = `
    <form id="recommended-hashtag-form" class="filter-row" style="margin-bottom:12px">
      <select id="recommended-hashtag-used" style="width:240px">
        <option value="">사용된 해시태그 선택</option>
        ${usedOptions || '<option value="" disabled>사용된 해시태그 없음</option>'}
      </select>
      <input type="text" id="recommended-hashtag-name" maxlength="30" placeholder="직접 입력 (최대 30자)" style="width:240px">
      <button type="submit" class="btn btn-primary">추가</button>
    </form>
    <p class="txt-muted" style="margin-bottom:8px">현재 ${recommendedHashtagItems.length}개 · 글 작성 화면 추천 칩에 이 순서대로 보입니다.</p>
    ${
      recommendedHashtagItems.length
        ? `<table class="data-table"><tbody>${rows}</tbody></table>`
        : '<div class="txt-muted">등록된 추천 해시태그가 없습니다.</div>'
    }
  `;
  host.querySelector('#recommended-hashtag-form')?.addEventListener('submit', onAddRecommendedHashtag);
  host.querySelector('#recommended-hashtag-used')?.addEventListener('change', onPickUsedHashtag);
  host.querySelectorAll('[data-rh-delete]').forEach((button) => {
    button.addEventListener('click', () => onDeleteRecommendedHashtag(button.dataset.rhDelete));
  });
}

async function loadRecommendedHashtagsPanel() {
  const host = document.getElementById('recommended-hashtags-host');
  if (!host) return;
  host.innerHTML = '<div class="txt-muted">불러오는 중…</div>';
  try {
    const [listRes, usedRes] = await Promise.all([
      api('/recommended-hashtags'),
      api('/recommended-hashtags/used').catch(() => ({ data: { items: [] } })),
    ]);
    recommendedHashtagItems = Array.isArray(listRes.data?.items) ? listRes.data.items : [];
    usedHashtagOptions = Array.isArray(usedRes.data?.items) ? usedRes.data.items : [];
    renderRecommendedHashtags();
  } catch (error) {
    host.innerHTML = `<div class="txt-muted">${escapeHashtagText(error.message || '목록을 불러오지 못했습니다.')}</div>`;
  }
}

async function addRecommendedHashtagName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const { data } = await api('/recommended-hashtags', {
    method: 'POST',
    body: JSON.stringify({ name: trimmed }),
  });
  recommendedHashtagItems = Array.isArray(data?.items) ? data.items : recommendedHashtagItems;
  renderRecommendedHashtags();
}

async function onPickUsedHashtag(event) {
  const name = String(event.target?.value || '').trim();
  if (!name) return;
  try {
    await addRecommendedHashtagName(name);
  } catch (error) {
    alert(error.message || '추가에 실패했습니다.');
    if (event.target) event.target.value = '';
  }
}

async function onAddRecommendedHashtag(event) {
  event.preventDefault();
  const input = document.getElementById('recommended-hashtag-name');
  const name = String(input?.value || '').trim();
  if (!name) return;
  try {
    await addRecommendedHashtagName(name);
  } catch (error) {
    alert(error.message || '추가에 실패했습니다.');
  }
}

async function onDeleteRecommendedHashtag(id) {
  if (!id) return;
  if (!confirm('이 추천 해시태그를 삭제할까요?')) return;
  try {
    const { data } = await api(`/recommended-hashtags/${id}`, { method: 'DELETE' });
    recommendedHashtagItems = Array.isArray(data?.items) ? data.items : recommendedHashtagItems;
    renderRecommendedHashtags();
  } catch (error) {
    alert(error.message || '삭제에 실패했습니다.');
  }
}

function loadRecommendedHashtags() {
  return loadRecommendedHashtagsPanel();
}
