import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createSearchStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingTop: normalize(6),
      paddingBottom: normalize(7),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight20,
    },
    backButton: {
      paddingHorizontal: normalize(4),
      paddingVertical: normalize(4),
      marginRight: normalize(4),
    },
    backButtonText: {
      fontSize: normalize(fontSizes.title),
      color: colors.textPrimary,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(7),
      gap: normalize(8),
    },
    searchIconText: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textSecondary,
      opacity: 0.6,
    },
    searchQueryText: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    clearButton: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      backgroundColor: colors.backgroundGray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButtonText: {
      fontSize: normalize(fontSizes.md),
      color: colors.background,
      fontFamily: fonts.bold,
    },
    cancelText: {
      marginLeft: normalize(8),
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight70,
      fontFamily: fonts.regular,
    },

    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      paddingHorizontal: normalize(4),
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(10),
    },
    tabText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    tabActive: {},
    tabTextActive: {
      color: colors.textPrimary,
      fontFamily: fonts.bold,
    },
    tabBadge: {
      marginLeft: normalize(4),
      paddingHorizontal: normalize(5),
      paddingVertical: normalize(1),
      borderRadius: normalize(10),
      backgroundColor: colors.primary,
    },
    tabBadgeText: {
      fontSize: normalize(fontSizes.md),
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },

    // SearchResult 상단 탭 (정렬 버튼 스타일 유사)
    searchTabsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: width * 0.05,
      paddingVertical: normalize(8),
      gap: normalize(8),
      backgroundColor: colors.background,
    },
    searchTabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(18),
      backgroundColor: colors.background,
      gap: normalize(4),
    },
    searchTabButtonActive: {
      backgroundColor: colors.primary,
    },
    searchTabButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    searchTabButtonTextActive: {
      color: colors.background,
    },

    // SearchScreen 미리보기 드롭다운
    previewDropdown: {
      marginTop: normalize(6),
      marginHorizontal: normalize(16),
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(10),
      borderRadius: normalize(10),
      backgroundColor: colors.background,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    previewSection: {
      marginBottom: normalize(6),
    },
    previewSectionTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginBottom: normalize(4),
    },
    previewItem: {
      paddingVertical: normalize(6),
    },
    previewItemText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },

    content: {
      flex: 1,
      backgroundColor: colors.textLight5,
    },
    section: {
      backgroundColor: colors.background,
      paddingTop: normalize(20),
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: normalize(18),
      marginBottom: normalize(7),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    sectionBadge: {
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryLight20,
    },
    sectionBadgeText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },

    card: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(13),
    },
    fullCard: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
      backgroundColor: colors.background,
    },
    fromBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
      borderRadius: normalize(4),
      backgroundColor: colors.primaryLight20,
      marginBottom: normalize(4),
    },
    fromBadgeText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },
    cardTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(3),
    },
    fullTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(5),
    },
    cardContent: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight70,
      marginBottom: normalize(4),
    },
    fullContent: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight70,
      marginBottom: normalize(6),
    },
    meta: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    moreButton: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },

    highlightText: {
      backgroundColor: colors.primaryLight50,
      color: colors.primaryDark,
      borderRadius: 3,
      paddingHorizontal: 2,
      fontFamily: fonts.bold,
    },

    // 검색 결과 하단 푸터
    searchFooter: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(16),
      marginTop: normalize(8),
      backgroundColor: colors.background,
    },
    searchFooterLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginBottom: normalize(8),
    },
    searchFooterTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(6),
    },
    searchFooterTagChip: {
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(5),
      borderRadius: normalize(14),
      backgroundColor: colors.primaryLight30,
    },
    searchFooterTagText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    searchFooterSummaryBox: {
      paddingHorizontal: normalize(20),
      paddingTop: normalize(10),
      paddingBottom: normalize(50),
      backgroundColor: 'transparent',
    },
    searchFooterSummary: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
};

// 검색 화면(SearchScreen) 전용 — searchscreen.jsx
export const createSearchScreenStyles = (width, normalize) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flexOne: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },

    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(6),
      paddingBottom: normalize(7),
      zIndex: 10,
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
        Platform.OS === 'android' ? normalize(6) : normalize(7),
      gap: normalize(8),
      flex: 1,
    },
    searchBackButton: {
      marginRight: normalize(6),
      padding: normalize(4),
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      padding: 0,
      includeFontPadding: false,
    },

    previewDropdown: {
      marginTop: normalize(6),
      backgroundColor: colors.background,
      borderRadius: normalize(14),
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    previewGroupLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      paddingHorizontal: normalize(14),
      paddingTop: normalize(12),
      paddingBottom: normalize(4),
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(11),
      gap: normalize(10),
    },
    previewRowBorder: {},
    previewSchoolIcon: {
      width: normalize(28),
      height: normalize(28),
      borderRadius: normalize(8),
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewPostIcon: {
      width: normalize(28),
      height: normalize(28),
      borderRadius: normalize(8),
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewRowText: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    previewDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textLight5,
      marginHorizontal: normalize(14),
      marginVertical: normalize(4),
    },

    section: {
      backgroundColor: colors.background,
      paddingTop: normalize(20),
    },
    sectionRecommendTags: {
      backgroundColor: colors.background,
      marginTop: normalize(8),
      paddingTop: normalize(20),
      paddingBottom: normalize(28),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
      marginBottom: normalize(7),
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
    dimMeta: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight20,
    },

    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: normalize(18),
      paddingVertical: normalize(13),
      gap: normalize(10),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight5,
    },
    recentText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    recentDeleteBtn: {
      marginLeft: 'auto',
    },

    popularGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    popularRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '50%',
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(11),
      gap: normalize(10),
    },
    popularRank: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textLight20,
      width: normalize(20),
      textAlign: 'center',
    },
    popularRankTop: {
      color: colors.primaryDark,
    },
    popularKeyword: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    popularTrend: {
      width: normalize(20),
      alignItems: 'center',
    },
    trendLabel: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      letterSpacing: 0.3,
    },

    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: normalize(16),
      gap: normalize(8),
    },
    tag: {
      backgroundColor: colors.primaryLight10,
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(5),
      borderRadius: normalize(20),
    },
    tagText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
  });
};

// 검색 결과 화면 상단 학교 버튼 전용 스타일
export const createSchoolSearchStyles = (normalize) => {
  return StyleSheet.create({
    schoolSearchCard: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(12),
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    schoolSearchInfo: {
      flexShrink: 1,
      paddingRight: normalize(8),
    },
    schoolSearchLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(4),
    },
    schoolSearchName: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    schoolSearchButton: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(8),
    },
    schoolSearchButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.background,
    },
  });
};

