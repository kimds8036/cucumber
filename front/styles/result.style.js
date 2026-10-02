import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createSearchResultStyles = (normalize, width) => {
  const gutter = width * 0.04;
  return StyleSheet.create({
    flexOne: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    scrollView: {
      flex: 1,
      paddingTop: normalize(8),
    },
    resultScrollView: {
      flex: 1,
    },
    scrollBottomSpacer: {
      height: normalize(32),
    },

    tabBar: {
      backgroundColor: colors.white,
      paddingTop: normalize(5),
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: gutter,
      gap: normalize(8),
    },
    tag: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(5),
      borderRadius: normalize(20),
      backgroundColor: colors.textLight1,
    },
    tagText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: gutter,
      paddingVertical: normalize(13),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight1,
      gap: normalize(8),
    },
    recentText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    recentDeleteBtn: {
      marginLeft: 'auto',
    },
    tabContent: {
      alignItems: 'center',
      paddingHorizontal: gutter,
      paddingBottom: normalize(10),
      gap: normalize(8),
    },
    tabBtn: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(6),
      borderRadius: normalize(20),
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.textLight1,
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    tabText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
    tabTextActive: {
      color: colors.white,
    },

    section: {
      backgroundColor: colors.white,
    },
    /** 학교 섹션 아래에 게시판 등 다른 섹션이 올 때 블록 간 간격 */
    sectionGapAfterSchool: {
      marginBottom: normalize(10),
    },
    sectionGapBetweenTargetSections: {
      marginBottom: normalize(10),
    },
    sectionRecommendTags: {
      backgroundColor: colors.white,
      marginTop: normalize(8),
      paddingTop: normalize(20),
      paddingBottom: normalize(20),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: gutter,
      marginBottom: normalize(7),
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIconSpacing: {
      marginRight: normalize(6),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
      letterSpacing: -0.2,
      marginTop: normalize(4),
    },
    dimAction: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight2,
    },
    countBadge: {
      backgroundColor: colors.textLight1,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
      borderRadius: normalize(999),
    },
    countBadgeText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },

    schoolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: gutter,
      paddingVertical: normalize(10),
      gap: normalize(12),
    },
    schoolIconBox: {
      padding: normalize(7),
      borderRadius: normalize(10),
      backgroundColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    schoolName: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
    },

    cardGutter: {
      paddingHorizontal: gutter,
    },
    highlightText: {
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },

    moreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(13),
      gap: normalize(4),
    },
    moreBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },

    centerBox: {
      paddingVertical: normalize(20),
      alignItems: 'center',
    },
    loadMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(10),
      borderRadius: normalize(20),
      backgroundColor: colors.white,
    },
    loadMoreText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    loadMoreChevron: {
      marginLeft: normalize(4),
    },

    emptyBox: {
      alignItems: 'center',
      paddingVertical: normalize(56),
      paddingHorizontal: normalize(32),
    },
    emptyIconBox: {
      width: normalize(56),
      height: normalize(56),
      borderRadius: normalize(28),
      backgroundColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(14),
    },
    emptyTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(6),
    },
    emptyDesc: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    endOfResultsBox: {
      paddingVertical: normalize(18),
      paddingHorizontal: normalize(24),
      alignItems: 'center',
    },
    endOfResultsText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      textAlign: 'center',
    },
  });
};
