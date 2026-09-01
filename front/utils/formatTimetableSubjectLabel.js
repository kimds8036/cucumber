export const TIMETABLE_SUBJECT_LABEL_MAX_CHARS = 10;

export const timetableSubjectCellTextProps = {
  numberOfLines: 2,
  ellipsizeMode: 'tail',
  lineBreakMode: 'wordWrapping',
  lineBreakStrategyIOS: 'hangul-word',
};

/**
 * 인앱 시간표 셀 과목명.
 * - 10자 이하: 그대로 (2줄 자연 줄바꿈)
 * - 10자 초과: 앞 10자 + ".." 를 2줄로 분할
 */
export function formatTimetableSubjectLabel(name) {
  const t = String(name ?? '').trim();
  if (!t) return '';
  if (t.length <= TIMETABLE_SUBJECT_LABEL_MAX_CHARS) return t;

  const truncated = `${t.slice(0, TIMETABLE_SUBJECT_LABEL_MAX_CHARS)}..`;
  const mid = Math.ceil(truncated.length / 2);
  return `${truncated.slice(0, mid)}\n${truncated.slice(mid)}`;
}
