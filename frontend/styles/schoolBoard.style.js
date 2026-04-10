import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

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
      paddingVertical: normalize(16),
    },
    postItem: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      padding: normalize(16),
      marginBottom: normalize(12),
      ...shadow.md,
    },

    // 게시글 헤더 (좌: 익명•시간, 우: 위치)
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(12),
    },
    postHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
      minWidth: 0,
    },
    postAuthorRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
      minWidth: 0,
    },
    postAuthorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    postAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    postAuthorHighlighted: {
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    postAuthorVerified: {
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    postTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    postTimeRowShrink: {
      flexShrink: 1,
    },
    postDot: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textSecondary,
      marginHorizontal: normalize(6),
    },
    postTime: {
      fontSize: normalize(fontSizes.lg),
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
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    postLocationTextShrink: {
      flexShrink: 1,
      minWidth: 0,
    },
    postLocationWrap: {
      flexShrink: 1,
    },
    postLocationInlineText: {
      flexShrink: 1,
      minWidth: 0,
    },
    postHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: normalize(8),
      flexShrink: 0,
    },
    postDistanceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(1),
      backgroundColor: colors.primaryLight30,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
    },
    postDistanceText: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    distanceBadgeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: normalize(8),
      flexShrink: 0,
    },
    distanceBadgeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(1),
      backgroundColor: colors.primaryLight30,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
    },
    distanceBadgeTextRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(1),
    },
    distanceBadgeNumber: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    distanceBadgeUnit: {
      fontSize: normalize(10),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },

    // 게시글 내용
    postBody: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    postBodyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    postContentArea: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'column',
    },
    postBodyColumn: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'column',
    },
    postContentAreaWithThumb: {
      marginRight: normalize(10),
    },
    postBodyColumnWithThumb: {
      marginRight: normalize(10),
    },
    postContent: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(10),
    },
    postContentCompact: {
      marginBottom: normalize(7),
    },
    postTagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(6),
      marginBottom: normalize(7),
    },
    postTagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(6),
      marginBottom: normalize(7),
    },
    postTagItem: {
      backgroundColor: colors.primaryLight30,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
    },
    postTagChip: {
      backgroundColor: colors.primaryLight30,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
    },
    postTagMeasureHidden: {
      opacity: 0,
      position: 'absolute',
    },
    postTagMoreChip: {
      minWidth: normalize(36),
      alignItems: 'center',
    },
    postTagText: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    postFooterLeft: {
      justifyContent: 'flex-start',
    },
    postFooterStart: {
      justifyContent: 'flex-start',
    },
    postThumbnail: {
      width: normalize(65),
      height: normalize(65),
      borderRadius: normalize(8),
      backgroundColor: colors.textLight10 ?? '#EEE',
    },
    postThumb: {
      width: normalize(65),
      height: normalize(65),
      borderRadius: normalize(8),
      backgroundColor: colors.textLight10 ?? '#EEE',
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
      fontSize: normalize(fontSizes.xl),
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
      ...shadow.lg,
    },
    emptyContainer: {
      paddingVertical: normalize(40),
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    loadingMoreContainer: {
      paddingVertical: normalize(16),
      alignItems: 'center',
    },
    loadingMoreText: {
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    listContentContainer: {
      paddingBottom: normalize(80),
    },
  });
};

