/**
 * 우리말샘(opendict) 검증 — 클라이언트는 형식만 검사.
 * 실제 조회는 백엔드 `URIMALSAEM_API_KEY` + opendict.korean.go.kr/api/search
 */
export async function validateKoreanWord(word) {
  const cleaned = String(word || '').trim();
  if (!cleaned) {
    return { ok: false, source: 'local', message: '단어를 입력해 주세요.' };
  }
  if (!/^[가-힣]+$/.test(cleaned)) {
    return {
      ok: false,
      source: 'local',
      message: '한글 단어만 입력할 수 있어요.',
    };
  }
  if (cleaned.length < 2) {
    return {
      ok: false,
      source: 'local',
      message: '두 글자 이상 단어를 입력해 주세요.',
    };
  }
  return { ok: true, source: 'stub' };
}
