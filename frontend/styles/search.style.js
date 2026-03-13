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
      backgroundColor: '#f4f5f7',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      paddingTop: normalize(14),
      paddingBottom: normalize(12),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: '#ebebeb',
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
      backgroundColor: '#f2f3f5',
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

    content: {
      flex: 1,
      backgroundColor: '#f4f5f7',
    },
    section: {
      backgroundColor: colors.background,
      marginBottom: normalize(8),
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#ebebeb',
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
      borderRadius: normalize(6),
      backgroundColor: '#a6da9520',
    },
    sectionBadgeText: {
      fontSize: normalize(11),
      color: '#2d7a5f',
      fontFamily: fonts.bold,
    },

    card: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(10),
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
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
  });
};

