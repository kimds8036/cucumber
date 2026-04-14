import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createSearchResultStyles = (normalize) => {
  return StyleSheet.create({
    flexOne: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      paddingTop: normalize(8),
    },
    scrollBottomSpacer: {
      height: normalize(32),
    },

    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(6),
      paddingBottom: normalize(7),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight20,
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(999),
      paddingHorizontal: normalize(12),
      paddingVertical:
        Platform.OS === 'android' ? normalize(5) : normalize(7),
      gap: normalize(8),
      flex: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      padding: 0,
      includeFontPadding: false,
    },
    searchBackButton: {
      marginRight: normalize(6),
      padding: normalize(4),
      justifyContent: 'center',
      alignItems: 'center',
    },

    tabBar: {
      backgroundColor: colors.background,
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
      backgroundColor: colors.textLight5,
    },
    tagText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: normalize(18),
      paddingVertical: normalize(13),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight5,
      gap: normalize(8),
    },
    recentText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
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
      backgroundColor: colors.textLight5,
    },
    tabBtnActive: {
      backgroundColor: colors.textPrimary,
    },
    tabText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
    },

    section: {
      backgroundColor: colors.background,
    },
    /** 학교 섹션 아래에 게시판 등 다른 섹션이 올 때 블록 간 간격 */
    sectionGapAfterSchool: {
      marginBottom: normalize(10),
      borderBottomWidth: 10,
      borderBottomColor: colors.textLight5,
    },
    sectionGapBetweenTargetSections: {
      marginBottom: normalize(10),
      borderBottomWidth: 10,
      borderBottomColor: colors.textLight5,
    },
    sectionRecommendTags: {
      backgroundColor: colors.background,
      marginTop: normalize(8),
      paddingTop: normalize(20),
      paddingBottom: normalize(20),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
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
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    dimAction: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.background2,
    },
    countBadge: {
      backgroundColor: colors.textLight5,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(3),
      borderRadius: normalize(999),
    },
    countBadgeText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
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
      backgroundColor: colors.textLight5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    schoolName: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },

    card: {
      marginHorizontal: normalize(18),
      paddingVertical: normalize(14),
    },
    cardBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    cardTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(4),
      lineHeight: normalize(20),
    },
    cardSnippet: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
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
    },
    fullCardBorder: {},
    fullTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(6),
      lineHeight: normalize(22),
    },
    fullSnippet: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(19),
      marginBottom: normalize(8),
    },

    metaText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.background2,
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
      color: colors.background2,
    },
    metaTimeInline: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.background2,
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
      color: colors.textSecondary,
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
      color: colors.textSecondary,
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
      backgroundColor: colors.background,
    },
    loadMoreText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
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
      backgroundColor: colors.textLight5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(14),
    },
    emptyTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(6),
    },
    emptyDesc: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    endOfResultsBox: {
      paddingVertical: normalize(18),
      paddingHorizontal: normalize(24),
      alignItems: 'center',
    },
    endOfResultsText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
};
