import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createSearchResultStyles = (normalize) => {
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
      paddingHorizontal: normalize(16),
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
      marginHorizontal: normalize(18),
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
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      gap: normalize(8),
    },
    tabBtn: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(5),
      borderRadius: normalize(20),
      backgroundColor: colors.textLight1,
    },
    tabBtnActive: {
      backgroundColor: colors.text,
    },
    tabText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    tabTextActive: {
      color: colors.white,
      fontFamily: fonts.bold,
    },

    section: {
      backgroundColor: colors.white,
    },
    /** 학교 섹션 아래에 게시판 등 다른 섹션이 올 때 블록 간 간격 */
    sectionGapAfterSchool: {
      marginBottom: normalize(10),
      borderBottomWidth: 7,
      borderBottomColor: colors.textLight1,
    },
    sectionGapBetweenTargetSections: {
      marginBottom: normalize(10),
      borderBottomWidth: 7,
      borderBottomColor: colors.textLight1,
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
      paddingHorizontal: normalize(20),
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
      marginHorizontal: normalize(18),
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

    card: {
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(14),
    },
    cardBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight1,
    },
    cardTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(4),
      lineHeight: normalize(20),
    },
    cardSnippet: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: normalize(18),
      marginBottom: normalize(6),
    },
    highlightText: {
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },

    fullCard: {
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight1,
    },
    fullCardBorder: {},

    searchAdBorder: {
      borderTopWidth: 7,
      borderTopColor: colors.textLight1,
    },

    fullTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(6),
      lineHeight: normalize(22),
    },
    fullSnippet: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: normalize(19),
      marginBottom: normalize(8),
    },

    metaText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight2,
    },
    metaTopRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: normalize(4),
    },
    contentTimeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: normalize(8),
    },
    snippetWrap: {
      flex: 1,
    },
    metaTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight2,
    },
    metaTimeInline: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight2,
    },
    metaBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(12),
      marginTop: normalize(3),
    },
    metaStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    metaStatText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
