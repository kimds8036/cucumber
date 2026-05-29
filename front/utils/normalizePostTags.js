/**
 * 목록/상세 API에서 오는 tags 필드를 항상 객체 배열 형태로 맞춥니다.
 * MySQL JSON_ARRAYAGG 등으로 태그가 1개일 때 배열이 아닌 단일 객체로 올 수 있습니다.
 */

const TAG_PREVIEW_LEN = 160;

function devWarnUnexpected(raw, reason) {
  if (!__DEV__) return;
  let preview = '';
  try {
    if (typeof raw === 'string') preview = raw.slice(0, TAG_PREVIEW_LEN);
    else if (typeof raw === 'object')
      preview = JSON.stringify(raw).slice(0, TAG_PREVIEW_LEN);
    else preview = String(raw).slice(0, TAG_PREVIEW_LEN);
  } catch {
    preview = '[preview error]';
  }
  // eslint-disable-next-line no-console
  console.warn('[normalizeTagsFromApi]', reason, { type: typeof raw, preview });
}

/**
 * @param {unknown} raw
 * @returns {Array<Record<string, unknown>>} 태그 객체 배열 (name 필드 권장)
 */
export function normalizeTagsFromApi(raw) {
  if (raw == null || raw === '') {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === 'object') {
    return [raw];
  }

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];

    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (parsed != null && typeof parsed === 'object') {
          return [parsed];
        }
        devWarnUnexpected(raw, 'JSON 파싱 결과가 배열/객체가 아님');
        return [];
      } catch (e) {
        devWarnUnexpected(raw, `JSON 파싱 실패: ${e?.message || e}`);
        // 아래 일반 문자열 규칙으로 폴백
      }
    }

    if (s.includes(',')) {
      const parts = s
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        return parts.map((name) => ({ name }));
      }
    }

    if (s.length <= 200) {
      return [{ name: s }];
    }

    devWarnUnexpected(raw, '문자열이 너무 길어 단일 태그로 취급하지 않음');
    return [];
  }

  devWarnUnexpected(raw, '지원하지 않는 타입');
  return [];
}
