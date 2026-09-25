import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createSearchStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingTop: normalize(6),
      paddingBottom: normalize(7),
      backgroundColor: colors.white,
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight2,
    },
    backButton: {
      paddingHorizontal: normalize(4),
      paddingVertical: normalize(4),
      marginRight: normalize(4),
    },
    backButtonText: {
      fontSize: normalize(fontSizes.title),
      color: colors.text,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(7),
      gap: normalize(8),
    },
    searchIconText: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
      opacity: 0.6,
    },
    searchQueryText: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    clearButton: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      backgroundColor: colors.textLight2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButtonText: {
      fontSize: normalize(fontSizes.md),
      color: colors.white,
      fontFamily: fonts.bold,
    },
    cancelText: {
      marginLeft: normalize(8),
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight5,
      fontFamily: fonts.regular,
    },

    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.white,
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
      color: colors.textLight4,
    },
    tabActive: {},
    tabTextActive: {
      color: colors.text,
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
      backgroundColor: colors.white,
    },
    searchTabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(18),
      backgroundColor: colors.white,
      gap: normalize(4),
    },
    searchTabButtonActive: {
      backgroundColor: colors.primary,
    },
    searchTabButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
    searchTabButtonTextActive: {
      color: colors.white,
    },

    // SearchScreen 미리보기 드롭다운
    previewDropdown: {
      marginTop: normalize(6),
      marginHorizontal: normalize(16),
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(10),
      borderRadius: normalize(10),
      backgroundColor: colors.white,
      shadowColor: colors.text,
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
      color: colors.textLight4,
      marginBottom: normalize(4),
    },
    previewItem: {
      paddingVertical: normalize(6),
    },
    previewItemText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
    },

    content: {
      flex: 1,
      backgroundColor: colors.textLight1,
    },
    section: {
      backgroundColor: colors.white,
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
      color: colors.text,
      letterSpacing: -0.2,
    },
    sectionBadge: {
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryLight3,
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
      backgroundColor: colors.white,
    },
    fromBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
      borderRadius: normalize(4),
      backgroundColor: colors.primaryLight3,
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
      color: colors.text,
      marginBottom: normalize(3),
    },
    fullTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(5),
    },
    cardContent: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight5,
      marginBottom: normalize(4),
    },
    fullContent: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight5,
      marginBottom: normalize(6),
    },
    meta: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight3,
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
      backgroundColor: colors.primaryLight5,
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
      backgroundColor: colors.white,
    },
    searchFooterLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight4,
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
      backgroundColor: colors.primaryLight4,
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
      color: colors.textLight4,
      textAlign: 'center',
    },
  });
};

// 검색 화면(SearchScreen) 전용 — searchscreen.jsx
export const createSearchScreenStyles = (width, normalize) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.white,
    },
    flexOne: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    scrollView: {
      flex: 1,
    },

    previewDropdown: {
      marginTop: normalize(6),
      backgroundColor: colors.white,
      borderRadius: normalize(14),
      overflow: 'hidden',
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    previewGroupLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight4,
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
      backgroundColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewPostIcon: {
      width: normalize(28),
      height: normalize(28),
      borderRadius: normalize(8),
      backgroundColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewRowText: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      lineHeight: normalize(20),
    },
    previewDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textLight1,
      marginHorizontal: normalize(14),
      marginVertical: normalize(4),
    },

    section: {
      backgroundColor: colors.white,
      paddingTop: normalize(20),
    },
    sectionRecommendTags: {
      backgroundColor: colors.white,
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
      color: colors.text,
      letterSpacing: -0.2,
    },
    dimAction: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight2,
    },
    dimMeta: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight2,
    },

    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: normalize(18),
      paddingVertical: normalize(13),
      gap: normalize(10),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight1,
    },
    recentText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
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
      color: colors.textLight2,
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
      color: colors.text,
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
      backgroundColor: colors.primaryLight2,
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
      backgroundColor: colors.white,
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
      color: colors.textLight4,
      marginBottom: normalize(4),
    },
    schoolSearchName: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    schoolSearchButton: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(8),
    },
    schoolSearchButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.white,
    },
  });
};
