import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createSchoolBoardStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // 게시글 목록
    postList: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(5),
    },
    postItem: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      padding: normalize(16),
      marginBottom: normalize(12),
      shadowColor: colors.shadow,
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },

    // 게시글 헤더 (좌: 익명•시간, 우: 위치)
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(12),
    },
    postAuthorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    postAuthor: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    postTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    postDot: {
      fontSize: normalize(13),
      color: colors.textSecondary,
      marginHorizontal: normalize(6),
    },
    postTime: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    postLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight30,
      paddingHorizontal: normalize(10),
      borderRadius: normalize(13),
      gap: normalize(4),
    },
    postLocationText: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // 게시글 내용
    postContent: {
      fontSize: normalize(14),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(10),
    },

    // 내용과 푸터 사이 경계선
    postDivider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(10),
    },

    // 게시글 푸터 (좌: 좋아요&댓글, 우: 햄버거)
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(15),
      paddingLeft: normalize(2),
    },
    postStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    postStatText: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    menuButton: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 플로팅 버튼
    floatingButton: {
      position: 'absolute',
      right: normalize(20),
      bottom: normalize(50),
      width: normalize(50),
      height: normalize(50),
      borderRadius: normalize(28),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
  });
};

