// 색상 테마 관리 파일
// 여기서 색상을 변경하면 전체 앱에 적용됩니다

export const colors = {
  // 메인 컬러
  primary: '#A6DA95',        // 메인 초록색
  primaryDark: '#6f9163',    // 진한 초록색
  scrap: '#F5A623',          // 스크랩 황금색

  // 배경 컬러
  background: '#fff',        // 기본 배경 (흰색)
  backgroundGray: '#D3D3D3', // 회색 배경
  surface: '#F7F7F7',        // 카드 배경 약간 다른 톤
  border: '#E0E0E0',         // 구분선/dashed border용

  // 검정 컬러
  textPrimary: '#272A26',       // 기본 텍스트 (진한 회색)
  textSecondary: 'rgba(39, 42, 38, 0.5)',     // 보조 텍스트 (중간 회색)
  background2: 'rgba(39, 42, 38, 0.3)',      // 비활성 텍스트 (밝은 회색)
  textWhite: '#fff',         // 흰색 텍스트

  // 오이 컬러
  green: '#F7FFF3',          // 초록
  yellow: '#FFFCD7',        // 노랑
  red: '#FFF3F3',        // 빨강
  blue: '#E5F0FF',           // 파랑

  // 알림
  alert: '#FF9F9F',
  subcolor: '#AAD7FF',

  // 추가 컬러
  shadow: '#000000',            // 그림자
  transparent: 'transparent', // 투명
  disabled: '#ECECEC',       // 비활성/삭제된 말풍선 배경 등

  // 투명도 버전 (Opacity)
  textLight5: 'rgba(39, 42, 38, 0.05)',   // 5%
  textLight10: 'rgba(0,0,0,0.1)',   // 10%
  textLight20: 'rgba(39, 42, 38, 0.2)',   // 20%
  textLight40: 'rgba(39, 42, 38, 0.4)',   // 40%
  textLight70: 'rgba(39, 42, 38, 0.7)',   // 70%
  primaryLight70: 'rgba(166,218,149, 0.7)', // 70%
  primaryLight50: 'rgba(166,218,149, 0.5)', // 50%
  primaryLight30: 'rgba(166,218,149, 0.3)', // 30%
  primaryLight20: 'rgba(166,218,149, 0.2)', // 20%
  primaryLight10: 'rgba(166,218,149, 0.1)', // 10%

  shadowLight: 'rgba(0, 0, 0, 0.1)',          // 밝은 그림자
  shadowMedium: 'rgba(0, 0, 0, 0.2)',         // 중간 그림자
  shadowDark: 'rgba(0, 0, 0, 0.3)',           // 진한 그림자

  overlay: 'rgba(0, 0, 0, 0.5)',              // 오버레이 (50%)
  overlayLight: 'rgba(0, 0, 0, 0.3)',         // 밝은 오버레이
  overlayDark: 'rgba(0, 0, 0, 0.7)',          // 진한 오버레이
};

export const TIMETABLE_SUBJECT_COLORS = [
  '#E6F4EA', '#E8F0FE', '#FDEFE3', '#F3E8FD', '#E7F7F6', '#FFF4CC', '#FCE8F3', '#EAF2FF',
  '#E9F7EF', '#F0F4FF', '#FFF1E6', '#F6ECFF', '#EAFBF8', '#FFF8DB', '#FFEFF6', '#EEF5FF',
  '#E4F5EA', '#EAF0FF', '#FDEADB', '#EFE6FF', '#E3F6F3', '#FFF2BF', '#FDE6F1', '#E3EDFF',
  '#DFF2E8', '#E3EAFE', '#FCE4D5', '#E9DEFD', '#DDF3EF', '#FFECAF', '#FBDDEA', '#DDE8FF',
  '#D8EEDF', '#DCE5FA', '#FBDCCB', '#E4D7FA', '#D6EEE8', '#FFE6A0', '#F9D6E6', '#D6E2FA',
];

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
};







