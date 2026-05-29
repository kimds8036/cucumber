import { StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, fontSizes, fonts } from './colors';

// normalize 함수를 export하여 컴포넌트에서 사용
export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

// 동적 스타일 생성 함수
export const createHeaderStyles = (width, height) => {
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const SPACING_H = width * 0.04;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING_H,
      paddingTop: normalize(8),
      paddingBottom: normalize(8),
      backgroundColor: colors.background,
      minHeight: normalize(56),
      paddingHorizontal: normalize(20),
    },
    tabContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tabButton: {
      paddingVertical: normalize(8),
      borderRadius: normalize(20),
    },
    activeTab: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: normalize(fontSizes.heading + 6),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    activeTabText: {
      fontFamily: fonts.bold,
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
      padding: normalize(8),
      minWidth: normalize(40),
      minHeight: normalize(40),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: normalize(25),
      backgroundColor: colors.green,
      borderWidth: 1,
      borderColor: colors.primaryLight50,
    },
    badge: {
      position: 'absolute',
      top: normalize(-1),
      right: normalize(4),
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(10),
      backgroundColor: colors.alert,
    },
  });
};

export const createFooterStyles = (width, height) => {
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'stretch',
      backgroundColor: colors.background,
      paddingVertical: normalize(10),
      paddingBottom: normalize(-8),
      height: normalize(65),
      borderTopWidth: 0.5,
      borderColor: colors.textLight5,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(4),
      minHeight: normalize(50),
      position: 'relative',
    },
    activeTabIndicator: {
      position: 'absolute',
      top: normalize(-10),
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: normalize(10),
      borderRightWidth: normalize(10),
      borderTopWidth: normalize(8),
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.primary,
    },
    tabText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginTop: normalize(4),
      fontWeight: '500',
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: '500',
    },
  });
};

// 서브 헤더 스타일 (뒤로가기 + 제목 + 경계선)
export const createSubHeaderStyles = (width, height) => {
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  return StyleSheet.create({
    header: {
      paddingTop: normalize(10),
      backgroundColor: colors.background,
      paddingHorizontal: width * 0.07,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: normalize(20),
      marginBottom: normalize(10),
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: -5,
    },
    headerTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    rightButton: {
      position: 'absolute',
      right: -5,
    },
    rightButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    divider: {
      height: 1,
      backgroundColor: colors.textLight20,
    },
  });
};

// 서브 푸터 스타일 (완료 버튼)
export const createSubFooterStyles = (width, height) => {
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(12),
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: normalize(12),
      paddingVertical: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      backgroundColor: colors.primaryLight50,
    },
    buttonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.background,
    },
    guideText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: normalize(8),
    },
    linkText: {
      color: colors.primary,
    },
  });
};
