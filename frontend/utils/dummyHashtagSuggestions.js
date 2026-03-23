/**
 * 글쓰기 「추천 태그」 UI 확인용 로컬 목록.
 * 서버 `/api/posts/tags/search` 연동 후에는 이 필터 대신 API 응답을 쓰면 됩니다.
 */
export const DUMMY_HASHTAG_RECOMMENDATIONS = [
  { id: 'd1', name: '오늘의급식' },
  { id: 'd2', name: '시험기간' },
  { id: 'd3', name: '방학' },
  { id: 'd4', name: '동아리' },
  { id: 'd5', name: '체육대회' },
  { id: 'd6', name: '수행평가' },
  { id: 'd7', name: '내신' },
  { id: 'd8', name: '질문' },
  { id: 'd9', name: '공부' },
  { id: 'd10', name: '급식메뉴' },
  { id: 'd11', name: '학교생활' },
  { id: 'd12', name: '친구' },
  { id: 'd13', name: '독서' },
  { id: 'd14', name: '자율활동' },
  { id: 'd15', name: '방과후' },
];

const normalizeQuery = (text) => String(text || '').replace(/^#/, '').trim();

/** 입력 문자열로 더미 목록 필터 (부분 일치, 최대 max개) */
export function filterDummyHashtagSuggestions(text, max = 12) {
  const q = normalizeQuery(text);
  if (!q) return [];

  const lower = q.toLowerCase();
  return DUMMY_HASHTAG_RECOMMENDATIONS.filter((t) => {
    const name = String(t.name);
    const n = name.toLowerCase();
    return n.includes(lower) || name.includes(q);
  }).slice(0, max);
}
