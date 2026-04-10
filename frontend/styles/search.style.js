import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

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
      paddingTop: normalize(14),
      paddingBottom: normalize(12),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
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
      backgroundColor: colors.backgroundGray,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(6),
      gap: normalize(6),
    },
    searchIconText: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textSecondary,
      opacity: 0.6,
    },
    searchQueryText: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.medium,
      color: colors.textPrimary,
    },
    clearButton: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      backgroundColor: '#c0c0c0',
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
      color: '#555',
      fontFamily: fonts.regular,
    },

    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: '#ebebeb',
      paddingHorizontal: normalize(4),
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(10),
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.medium,
      color: '#999',
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
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
      color: '#2d7a5f',
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
      borderBottomWidth: 1,
      borderColor: colors.textLight10,
    },
    searchTabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(18),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.textLight10,
      gap: normalize(4),
    },
    searchTabButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
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
      ...shadow.md,
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
      marginTop: normalize(7),
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: normalize(16),
      paddingTop: normalize(13),
      paddingBottom: normalize(8),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    sectionBadge: {
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryLight20,
    },
    sectionBadgeText: {
      fontSize: normalize(fontSizes.lg),
      color: '#2d7a5f',
      fontFamily: fonts.bold,
    },

    card: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(13),
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
    },
    fullCard: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
      borderBottomWidth: 1,
      borderBottomColor: '#f2f2f2',
      backgroundColor: colors.background,
    },
    fromBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
      borderRadius: normalize(4),
      backgroundColor: '#a6da9520',
      marginBottom: normalize(4),
    },
    fromBadgeText: {
      fontSize: normalize(fontSizes.lg),
      color: '#2d7a5f',
      fontFamily: fonts.bold,
    },
    cardTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.medium,
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
      color: '#888',
      marginBottom: normalize(4),
    },
    fullContent: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: '#555',
      marginBottom: normalize(6),
    },
    meta: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: '#bbb',
    },
    moreButton: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(12),
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.medium,
      color: '#2d7a5f',
    },

    highlightText: {
      backgroundColor: '#a6da9550',
      color: '#2d7a5f',
      borderRadius: 3,
      paddingHorizontal: 2,
      fontFamily: fonts.bold,
    },

    // 검색 결과 하단 푸터
    searchFooter: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(16),
      marginTop: normalize(8),
      borderWidth: 1,
      borderColor: colors.textLight10,
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
      paddingTop: normalize(12),
      paddingBottom: normalize(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
      zIndex: 10,
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      height: normalize(44),
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
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      paddingVertical: 0,
    },

    previewDropdown: {
      marginTop: normalize(6),
      backgroundColor: colors.background,
      borderRadius: normalize(14),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.textLight10,
      overflow: 'hidden',
      ...shadow.md,
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
    previewRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surface,
    },
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
      marginTop: normalize(8),
      paddingTop: normalize(20),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.textLight10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
    sectionRecommendTags: {
      backgroundColor: colors.background,
      marginTop: normalize(8),
      paddingTop: normalize(20),
      paddingBottom: normalize(28),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.textLight10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
      marginBottom: normalize(14),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    dimAction: {
      fontSize: normalize(fontSizes.xl),
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
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(13),
      gap: normalize(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.surface,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.surface,
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
      backgroundColor: colors.textLight5,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(8),
      borderRadius: normalize(20),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.textLight10,
    },
    tagText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      fontWeight: '500',
      color: colors.textSecondary,
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
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
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

/** SearchResult.jsx 전용 */
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
    },
    scrollBottomSpacer: {
      height: normalize(32),
    },

    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(10),
      paddingBottom: normalize(8),
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      height: normalize(44),
      gap: normalize(8),
      flex: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    searchBackButton: {
      marginRight: normalize(6),
      padding: normalize(4),
      justifyContent: 'center',
      alignItems: 'center',
    },

    tabBar: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: normalize(16),
      gap: normalize(8),
    },
    tag: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(6),
      borderRadius: normalize(16),
      backgroundColor: colors.textLight5,
    },
    tagText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
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
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(10),
      gap: normalize(6),
    },
    tabBtn: {
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(7),
      borderRadius: normalize(20),
      backgroundColor: colors.textLight5,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.textLight10,
    },
    tabBtnActive: {
      backgroundColor: colors.textPrimary,
      borderColor: colors.textPrimary,
    },
    tabText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
      fontWeight: '600',
    },

    section: {
      backgroundColor: colors.background,
      marginTop: normalize(8),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.textLight10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
    sectionRecommendTags: {
      backgroundColor: colors.background,
      marginTop: normalize(8),
      paddingBottom: normalize(28),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.textLight10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIconSpacing: {
      marginRight: normalize(6),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    clearRecentText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    countBadge: {
      backgroundColor: colors.textLight5,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(3),
      borderRadius: normalize(10),
    },
    countBadgeText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      fontWeight: '500',
      color: colors.textSecondary,
    },

    schoolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(14),
      gap: normalize(12),
    },
    schoolIconBox: {
      width: normalize(36),
      height: normalize(36),
      borderRadius: normalize(10),
      backgroundColor: colors.textLight5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    schoolName: {
      flex: 1,
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },

    card: {
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(14),
    },
    cardBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
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
      fontWeight: '700',
    },

    fullCard: {
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(16),
    },
    fullCardBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textLight10,
    },
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

    moreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(13),
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
      gap: normalize(4),
    },
    moreBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      fontWeight: '500',
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
      borderWidth: 1,
      borderColor: colors.textLight5,
      backgroundColor: colors.background,
    },
    loadMoreText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      fontWeight: '500',
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
      paddingVertical: normalize(28),
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


