// 색상 테마 관리 파일
// 여기서 색상을 변경하면 전체 앱에 적용됩니다

export const colors = {
  // 메인 컬러
  primary: '#A6DA95', // 메인 초록색
  primaryDark: '#6f9163', // 진한 초록색
  scrap: '#F5A623', // 스크랩 황금색
  scrapDark: '#A46E17',
  /** 캐시(대략) 거리 배지 — 주황 칩 배경 + 그 위 텍스트/아이콘 */
  distanceStaleChipBg: 'rgba(245, 166, 35, 0.42)',
  distanceStaleOnChip: '#5C3A08',
  green: '#F7FFF3',
  greenDark: '#C8EDB2',

  // 배경 컬러
  background: '#fff', // 기본 배경 (흰색)
  backgroundGray: '#D3D3D3', // 회색 배경
  surface: '#F7F7F7', // 카드 배경 약간 다른 톤
  guideBackground: '#FAF8F4', // 재학증명서 가이드 배경
  border: '#E0E0E0', // 구분선/dashed border용

  // 검정 컬러
  textPrimary: '#272A26', // 기본 텍스트 (진한 회색)
  textSecondary: 'rgba(39, 42, 38, 0.5)', // 보조 텍스트 (중간 회색)
  background2: 'rgba(39, 42, 38, 0.3)', // 비활성 텍스트 (밝은 회색)
  textWhite: '#fff', // 흰색 텍스트

  // 로고 컬러
  lightgreen: '#E8FFDD', // 초록
  yellow: '#FFFCD7', // 노랑
  red: '#FFF3F3', // 빨강
  blue: '#E5F0FF', // 파랑
  white: '#FFFFFF', // 흰색

  // 알림
  alert: '#FF9F9F',
  /** scrapDark와 동일 규칙(primary 다운틴트 비율) */
  alertDark: '#AB6A6A',
  alertLight: '#FFF0F0',
  subcolor: '#AAD7FF',

  // 추가 컬러
  shadow: '#000000', // 그림자
  transparent: 'transparent', // 투명
  disabled: '#ECECEC', // 비활성/삭제된 말풍선 배경 등
  timetableBorder: '#E6E6E6',

  // 투명도 버전 (Opacity)
  textLight5: 'rgba(39, 42, 38, 0.05)', // 5%
  textLight10: 'rgba(0,0,0,0.1)', // 10%
  textLight20: 'rgba(39, 42, 38, 0.2)', // 20%
  textLight40: 'rgba(39, 42, 38, 0.4)', // 40%
  textLight70: 'rgba(39, 42, 38, 0.7)', // 70%
  primaryLight70: 'rgba(166,218,149, 0.7)', // 70%
  primaryLight50: 'rgba(166,218,149, 0.5)', // 50%
  primaryLight30: 'rgba(166,218,149, 0.3)', // 30%
  primaryLight20: 'rgba(166,218,149, 0.2)', // 20%
  primaryLight10: 'rgba(166,218,149, 0.1)', // 10%
  primaryLight5: 'rgba(166,218,149, 0.05)', // 5%

  shadowLight: 'rgba(0, 0, 0, 0.1)', // 밝은 그림자
  shadowMedium: 'rgba(0, 0, 0, 0.2)', // 중간 그림자
  shadowDark: 'rgba(0, 0, 0, 0.3)', // 진한 그림자

  overlay: 'rgba(0, 0, 0, 0.5)', // 오버레이 (50%)
  overlayLight: 'rgba(0, 0, 0, 0.3)', // 밝은 오버레이
  overlayDark: 'rgba(0, 0, 0, 0.7)', // 진한 오버레이
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
