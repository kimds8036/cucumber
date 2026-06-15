/**
 * 학교명 검색: LIKE 와일카드 오용 방지 (% _ \ 제거)
 */
export function buildSafeSchoolSearchTerm(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const safe = t.replace(/[%_\\]/g, '');
  return safe.length ? safe : null;
}

const SCHOOL_SEARCH_CORE = `
  SELECT school_id, name, region, address
  FROM schools
  WHERE name LIKE ?
  ORDER BY
    CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
    LOCATE(?, name),
    CHAR_LENGTH(name),
    name ASC`;

/**
 * MySQL prepared statement은 LIMIT ? 바인딩이 실패하는 경우가 있어,
 * limit 는 검증된 정수만 SQL에 삽입한다.
 */
export function buildSchoolSearchSql(limit) {
  const lim = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 5));
  return `${SCHOOL_SEARCH_CORE.trim()}\n  LIMIT ${lim}`;
}

/** params: [likeContains, prefixPattern, locateNeedle] */
export function schoolSearchParams(safe) {
  const like = `%${safe}%`;
  const prefix = `${safe}%`;
  return [like, prefix, safe];
}
