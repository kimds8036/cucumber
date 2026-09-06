/**
 * 우리말샘(국립국어원) 검증 — 클라이언트 스텁.
 * 실제 키는 백엔드 Railway(develop) `URIMALSAEM_API_KEY` 에 두고
 * 서버 `hunminGameRooms.js` 의 validateWordServer 에서 검증합니다.
 * (프론트 EXPO_PUBLIC 에 올리지 마세요 — 키 노출됨)
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
