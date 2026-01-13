import { StyleSheet, Dimensions } from 'react-native';
import { colors } from './colors';

const { width, height } = Dimensions.get('window');

// 화면 크기 기준 계산
const scale = width / 375; // 기준: iPhone SE/8 크기 (375px)
const normalize = (size) => Math.round(scale * size);

// 반응형 크기
const HEADER_HEIGHT = height * 0.07; // 화면 높이의 7%
const FOOTER_HEIGHT = height * 0.09; // 화면 높이의 9%
const SPACING_H = width * 0.04; // 가로 여백 4%
const ICON_SIZE = normalize(24);
const FOOTER_ICON_SIZE = normalize(26);

// 헤더 스타일
export const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING_H,
    paddingVertical: height * 0.015,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
    maxHeight: 70,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: normalize(25),
    fontFamily: 'Baloo2-Bold',
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.textWhite,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.03,
  },
  iconButton: {
    position: 'relative',
    padding: normalize(4),
    minWidth: normalize(40),
    minHeight: normalize(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: normalize(4),
    right: normalize(4),
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: colors.error,
  },
});

// 푸터 스타일
export const footerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: height * 0.01,
    paddingBottom: height * 0.015,
    minHeight: 60,
    maxHeight: 80,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(4),
    minHeight: normalize(50),
  },
  tabText: {
    fontSize: normalize(11),
    color: colors.textTertiary,
    marginTop: normalize(4),
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
});

// 반응형 유틸리티 export (다른 파일에서도 사용 가능)
export const responsive = {
  width,
  height,
  normalize,
  spacing: {
    xs: width * 0.02,
    sm: width * 0.03,
    md: width * 0.04,
    lg: width * 0.05,
    xl: width * 0.06,
  },
};