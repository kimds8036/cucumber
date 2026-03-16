// 색상 테마 관리 파일
// 여기서 색상을 변경하면 전체 앱에 적용됩니다

export const colors = {
  // 메인 컬러
  primary: '#A6DA95',        // 메인 초록색
  primaryDark: '#6f9163',    // 진한 초록색

  // 배경 컬러
  background: '#fff',        // 기본 배경 (흰색)
  backgroundGray: '#D3D3D3', // 회색 배경

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

  // 추가 컬러
  shadow: '#000',            // 그림자
  transparent: 'transparent', // 투명

  // 투명도 버전 (Opacity)
  textLight5: 'rgba(39, 42, 38, 0.05)',   // 5%
  textLight10: 'rgba(39, 42, 38, 0.1)',   // 10%
  textLight20: 'rgba(39, 42, 38, 0.2)',   // 20%
  textLight70: 'rgba(39, 42, 38, 0.7)',   // 70%
  primaryLight70: 'rgba(166,218,149, 0.7)', // 70%
  primaryLight50: 'rgba(166,218,149, 0.5)', // 50%
  primaryLight30: 'rgba(166,218,149, 0.3)', // 30%

  shadowLight: 'rgba(0, 0, 0, 0.1)',          // 밝은 그림자
  shadowMedium: 'rgba(0, 0, 0, 0.2)',         // 중간 그림자
  shadowDark: 'rgba(0, 0, 0, 0.3)',           // 진한 그림자

  overlay: 'rgba(0, 0, 0, 0.5)',              // 오버레이 (50%)
  overlayLight: 'rgba(0, 0, 0, 0.3)',         // 밝은 오버레이
  overlayDark: 'rgba(0, 0, 0, 0.7)',          // 진한 오버레이
};

// 폰트 테마 관리
export const fonts = {
  regular: 'Baloo2-Regular',
  bold: 'Baloo2-Bold',
};

// 폰트 사이즈 (normalize 함수와 함께 사용)
export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  title: 24,
  heading: 28,
};
