import { Platform } from 'react-native';

/**
 * 논리 간격 — 기준폭 375에서의 시작값(시작값).
 * 화면에서는 getNormalize(width)(space.*) 로 스케일.
 * 플랫폼: iOS pt / Android dp (글자 크기는 colors.fontSizes → sp에 대응).
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** SubHeader · SignupPrimaryFooter 가로 거터 */
  screenGutterRatio: 0.07,
  /** 게시판 리스트 등 */
  listGutterRatio: 0.04,
};

/** 인터랙션 상태 — 코드에서 관측된 값 + 통일 시작값 */
export const interaction = {
  /** CTA·필 버튼 */
  activeOpacityPrimary: 0.7,
  /** 리스트·칩·아이콘 */
  activeOpacityDefault: 0.7,
  /** 약한 행 */
  activeOpacitySoft: 0.7,
};

// iOS/Android shadow 분기
export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
    },
    android: { elevation: 8 },
  }),
};

// 공통 border radius
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
