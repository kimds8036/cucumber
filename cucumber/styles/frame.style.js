import { StyleSheet, Platform, StatusBar } from 'react-native';
import { colors } from './colors';

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
      color: colors.textPrimary,
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
      padding: normalize(8),
      minWidth: normalize(40),
      minHeight: normalize(40),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: normalize(20),
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
      borderRadius: normalize(5),
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
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingVertical: normalize(8),
      paddingBottom: normalize(-8),
      height: normalize(65),
      borderTopWidth: 1,
      borderColor: colors.textLight20,
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
      fontSize: normalize(10),
      fontFamily: 'Baloo2-Bold',
      color: colors.textSecondary,
      marginTop: normalize(4),
      fontWeight: '500',
    },
    activeTabText: {
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });
};
