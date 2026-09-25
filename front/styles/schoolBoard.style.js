import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';
export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createSchoolBoardStyles = (width, normalize) => {
  const metaLineHeight = normalize(18);
  const metaTextAndroid =
    Platform.OS === 'android' ? { includeFontPadding: false } : {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },

    // 게시글 목록 — BoardPostCard + board.style.js 와 동일
    postList: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(16),
    },
    postItem: {
      backgroundColor: colors.white,
      borderRadius: normalize(18),
      padding: normalize(14),
      marginBottom: normalize(12),
      ...shadow.md,
    },

    // 게시글 헤더 (좌: 작성자•시간[·위치], 우: 거리 배지 등)
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(5),
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
    postAuthorVerified: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.alert,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postTimeRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(4),
    },
    postAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postDot: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      marginHorizontal: normalize(6),
      ...metaTextAndroid,
    },
    postTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight4,
      paddingHorizontal: normalize(10),
      borderRadius: normalize(13),
      gap: normalize(4),
    },
    postLocationText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    postLocationWrap: {
      flexShrink: 1,
    },
    postLocationInlineText: {
      flexShrink: 1,
      minWidth: 0,
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
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
    },
    distanceBadgeTextRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
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
    postContent: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      lineHeight: normalize(20),
      marginBottom: normalize(7),
    },
    postContentCompact: {
      marginBottom: normalize(5),
    },
    postTagsWrap: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: normalize(6),
      marginBottom: normalize(5),
      alignItems: 'center',
      overflow: 'hidden',
    },
    postTagChip: {
      flexShrink: 0,
    },
    postTagText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
      backgroundColor: colors.primaryLight2,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(5),
      paddingVertical: normalize(1),
    },
    postTagMeasureHidden: {
      position: 'absolute',
      top: -9999,
      left: -9999,
      opacity: 0,
    },
    postTagMoreChip: {
      backgroundColor: colors.primaryLight2,
      paddingHorizontal: normalize(1),
      paddingVertical: normalize(1),
      borderRadius: normalize(10),
    },
    postBodyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    postBodyColumn: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'column',
    },
    postBodyColumnWithThumb: {
      minHeight: normalize(70),
      justifyContent: 'space-between',
      marginRight: normalize(10),
    },
    postFooterStart: {
      justifyContent: 'flex-start',
    },
    postThumb: {
      width: normalize(70),
      height: normalize(70),
      borderRadius: normalize(8),
      backgroundColor: colors.textLight1,
      alignSelf: 'flex-start',
    },

    // 내용과 푸터 사이 경계선
    postDivider: {
      height: 1,
      backgroundColor: colors.textLight1,
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
      color: colors.textLight4,
    },
    menuButton: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    emptyContainer: {
      paddingVertical: normalize(40),
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    loadingMoreContainer: {
      paddingVertical: normalize(16),
      alignItems: 'center',
    },
    loadingMoreText: {
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    listContentContainer: {
      paddingBottom: normalize(80),
    },
  });
};
