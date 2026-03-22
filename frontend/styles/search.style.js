import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

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
      fontSize: normalize(18),
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
      fontSize: normalize(13),
      color: colors.textSecondary,
      opacity: 0.6,
    },
    searchQueryText: {
      flex: 1,
      fontSize: normalize(14),
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
      fontSize: normalize(10),
      color: colors.background,
      fontFamily: fonts.bold,
    },
    cancelText: {
      marginLeft: normalize(8),
      fontSize: normalize(13),
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
      fontSize: normalize(12),
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
      fontSize: normalize(10),
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
      fontSize: normalize(13),
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
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    previewSection: {
      marginBottom: normalize(6),
    },
    previewSectionTitle: {
      fontSize: normalize(11),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginBottom: normalize(4),
    },
    previewItem: {
      paddingVertical: normalize(6),
    },
    previewItemText: {
      fontSize: normalize(13),
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
      fontSize: normalize(14),
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
      fontSize: normalize(11),
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
      fontSize: normalize(11),
      color: '#2d7a5f',
      fontFamily: fonts.bold,
    },
    cardTitle: {
      fontSize: normalize(13),
      fontFamily: fonts.medium,
      color: colors.textPrimary,
      marginBottom: normalize(3),
    },
    fullTitle: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(5),
    },
    cardContent: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: '#888',
      marginBottom: normalize(4),
    },
    fullContent: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: '#555',
      marginBottom: normalize(6),
    },
    meta: {
      fontSize: normalize(11),
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
      fontSize: normalize(13),
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
      fontSize: normalize(11),
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
      fontSize: normalize(11),
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
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
};

// 검색 화면(SearchScreen) 전용 스타일
export const createSearchScreenStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.textLight5,
    },
    searchContainer: {
      backgroundColor: colors.background,
      padding: normalize(16),
      paddingBottom: normalize(20),
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      height: normalize(48),
      gap: normalize(8),
    },
    searchInput: {
      flex: 1,
      fontSize: normalize(16),
      color: colors.textPrimary,
    },
    section: {
      backgroundColor: colors.background,
      paddingBottom: normalize(16),
    },
    lastSection: {
      marginBottom: normalize(20),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      marginBottom: normalize(16),
    },
    sectionTitle: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    clearButton: {
      fontSize: normalize(13),
      color: colors.textSecondary,
    },
    updateTime: {
      fontSize: normalize(10),
      color: colors.textSecondary,
    },
    recentSearchContainer: {
      paddingHorizontal: normalize(16),
    },
    recentSearchItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: normalize(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    recentSearchItemLast: {
      borderBottomWidth: 0,
    },
    recentSearchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      flex: 1,
    },
    recentSearchText: {
      fontSize: normalize(15),
      color: colors.textPrimary,
    },
    deleteButton: {
      padding: normalize(4),
    },
    popularSearchContainer: {
      paddingHorizontal: normalize(16),
    },
    popularSearchItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: normalize(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    popularSearchLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(12),
      flex: 1,
    },
    rank: {
      fontSize: normalize(16),
      fontFamily: fonts.bold,
      color: '#999',
      width: normalize(24),
      textAlign: 'center',
    },
    topRank: {
      color: colors.primary,
      fontSize: normalize(18),
    },
    popularKeyword: {
      fontSize: normalize(15),
      color: colors.textPrimary,
      flex: 1,
    },
    recommendContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: normalize(16),
      gap: normalize(8),
    },
    tagButton: {
      backgroundColor: colors.primaryLight30,
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(20),
    },
    tagText: {
      fontSize: normalize(14),
      color: colors.primaryDark,
      fontFamily: fonts.medium,
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
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(4),
    },
    schoolSearchName: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    schoolSearchButton: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(8),
    },
    schoolSearchButtonText: {
      fontSize: normalize(13),
      fontFamily: fonts.bold,
      color: colors.background,
    },
  });
};

