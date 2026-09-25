// 색상 테마 관리 파일
// 여기서 색상을 변경하면 전체 앱에 적용됩니다

export const colors = {
  // 브랜드
  primaryDark: '#6F9163',
  primary: '#A6DA95',
  primaryLight6: '#C1E5B5',
  primaryLight5: '#D3EDCA',
  primaryLight4: '#E4F4DF',
  primaryLight3: '#EDF8EA',
  primaryLight2: '#F6FBF4',
  primaryLight1: '#FBFDFA',

  // 무채색
  white: '#FFFFFF',
  text: '#000000',
  textLight1: '#E3E3E3',
  textLight2: '#C6C6C6',
  textLight3: '#AAAAAA',
  textLight4: '#8E8E8E',
  textLight5: '#717171',
  textLight6: '#555555',
  textLight7: '#393939',
  textLight8: '#1C1C1C',

  // 상태 컬러
  alertDark: '#AB6A6A',
  alert: '#FF9F9F',
  alertLight: '#FFF0F0',
  scrapDark: '#A46E17',
  scrap: '#F5A623',
  subcolor: '#AAD7FF',

  // 유지
  green: '#F7FFF3',
  greenDark: '#C8EDB2',
  lightgreen: '#E8FFDD',
  yellow: '#FFFCD7',
  red: '#FFF3F3',
  blue: '#E5F0FF',
  transparent: 'transparent',
};

export const TIMETABLE_SUBJECT_COLORS = [
  '#FFBCBC', // 레드
  '#FFEEA8', // 옐로우
  '#AEEEB9', // 그린
  '#A1ECE2', // 틸
  '#B5BEFB', // 바이올렛
  '#E3C8FE', // 퍼플
  '#D5B88F', // 브라운
  '#B9C0CB', // 슬레이트
  '#F2EDE4', // 아이보리 (공란 흰색과 구분)
  '#FFCB91', // 오렌지
  '#F28FC9', // 핑크
  '#7EC8F0', // 하늘
  '#7C8EF2', // 인디고
];

/** 공란(#FFFFFF)과 헷갈리는 연한 과목색 — 4x2 위젯에서 제외 */
export const TIMETABLE_SUBJECT_PALE_HEX = '#F2EDE4';

/** 4x2(미디엄) 위젯 등 — 흰 배경에서 잘 안 보이는 연한색 제외 */
export const TIMETABLE_SUBJECT_COLORS_NO_WHITE = TIMETABLE_SUBJECT_COLORS.filter(
  (c) => String(c).trim().toUpperCase() !== TIMETABLE_SUBJECT_PALE_HEX,
);

export const isTimetableWhiteColor = (hex) => {
  const h = String(hex || '').trim().toUpperCase().replace(/^#/, '');
  return h === 'F2EDE4' || h === 'FFFFFF';
};

/** #RRGGBB → rgba (위젯 4x4 cell `#80` ≈ 0.5 과 동일) */
export function hexToRgba(hex, opacity = 1) {
  const h = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * 인앱 시간표 격자 셀 배경 — Android/iOS Large(4x4) 위젯과 동일.
 * 일반: 과목색 50% / 아이보리: 불투명(테두리 없음)
 */
export function timetableSubjectCellStyle(hex) {
  if (!hex) return null;
  if (isTimetableWhiteColor(hex)) {
    return { backgroundColor: TIMETABLE_SUBJECT_PALE_HEX };
  }
  return { backgroundColor: hexToRgba(hex, 0.5) };
}

export const PROFILE_COLORS = {
  1: '#a6da95',
  2: '#89b4fa',
  3: '#f38ba8',
  4: '#fab387',
  5: '#a9e3cb',
  6: '#cba6f7',
};

// 폰트 테마 관리
export const fonts = {
  regular: 'Baloo2-Regular',
  bold: 'Baloo2-Bold',
};

// 폰트 사이즈 (normalize 함수와 함께 사용)
export const fontSizes = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  title: 18,
  heading: 20,
  guideStepNumber: 30,
};
