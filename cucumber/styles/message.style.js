import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createMessageStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // 쪽지/개인우편 토글 영역 (게시판 정렬 버튼과 동일 위치)
    toggleContainer: {
      flexDirection: 'row',
      paddingHorizontal: width * 0.1,
      paddingVertical: normalize(10),
      gap: normalize(8),
    },
    toggleTrack: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      borderWidth: 1,
      borderColor: colors.primaryLight50,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: normalize(6),
      borderRadius: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleOptionActive: {
      backgroundColor: colors.primary,
    },
    toggleOptionInactive: {
      backgroundColor: colors.transparent,
    },
    toggleOptionText: {
      fontSize: normalize(13),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    toggleOptionTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
    },

    // 메인 내용 영역 (플레이스홀더)
    contentArea: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(10),
    },
  });
};
