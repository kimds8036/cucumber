import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createBoardStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // 정렬 버튼 영역
    sortContainer: {
      flexDirection: 'row',
      paddingHorizontal: width * 0.05,
      paddingVertical: normalize(10),
      gap: normalize(8),
    },
    sortButton: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(20),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    sortButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortButtonText: {
      fontSize: normalize(13),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    sortButtonTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
    },

    // 게시글 목록
    postList: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(10),
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

    // 플로팅 버튼
    floatingButton: {
      position: 'absolute',
      right: normalize(20),
      bottom: normalize(115),
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

// 글쓰기 페이지 스타일
export const createWriteStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    box: {
      padding: normalize(5),
      backgroundColor: colors.textLight5,
    },
    box2: {
      padding: normalize(10),
      paddingBottom: normalize(35),
      backgroundColor: colors.textLight5,
      alignItems: 'center',
    },
    guideContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    guideText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    guideLink: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    content: {
      flex: 1,
      paddingHorizontal: normalize(20),
      paddingTop: normalize(16),
      borderWidth: 1,
      borderColor: colors.background2,
    },
    textInput: {
      flex: 1,
      fontSize: normalize(16),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      textAlignVertical: 'top',
      lineHeight: normalize(24),
    },
    placeholder: {
      fontSize: normalize(16),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
};
