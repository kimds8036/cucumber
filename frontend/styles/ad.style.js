import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createAdStyles = (normalize, width) => {
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  const w = typeof width === 'number' ? width : 360;

  return StyleSheet.create({
    // AdPlaceholder (board card style)
    postItem: {
      backgroundColor: colors.background,
      borderRadius: n(18),
      padding: n(14),
      marginBottom: n(12),
      ...shadow.md,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: n(5),
    },
    postAuthorRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
      minWidth: 0,
    },
    postAuthor: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(18),
      textAlignVertical: 'center',
    },
    postDot: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(18),
      textAlignVertical: 'center',
      marginHorizontal: n(6),
    },
    postTime: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(18),
      textAlignVertical: 'center',
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
    postContent: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: n(20),
      marginBottom: n(7),
    },
    postContentCompact: {
      marginBottom: n(5),
    },
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(15),
      paddingLeft: n(2),
    },
    postStatText: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // boarddetailADplaceholder
    adSection: {
      minHeight: n(40),
      marginHorizontal: w * 0,
      backgroundColor: colors.backgroundGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    adSectionText: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textWhite,
    },

    // ChatAdPlaceholder (message list style)
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: n(12),
      paddingHorizontal: n(8),
      backgroundColor: colors.background,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    listItemBody: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    listItemName: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: n(2),
    },
    listItemContent: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // SchoolAdPlaceholder
    container: {
      backgroundColor: colors.background,
      borderRadius: n(16),
      paddingHorizontal: n(10),
      paddingVertical: n(20),
      marginBottom: n(10),
      ...shadow.md,
    },
  });
};
