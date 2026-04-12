/**
 * 목록/상세 API에서 오는 tags 필드를 항상 객체 배열 형태로 맞춥니다.
 * MySQL JSON_ARRAYAGG 등으로 태그가 1개일 때 배열이 아닌 단일 객체로 올 수 있습니다.
 */
export function normalizeTagsFromApi(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s.startsWith('[')) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
      if (parsed != null && typeof parsed === 'object') return [parsed];
    } catch {
      return [];
    }
  }
  return [];
}
