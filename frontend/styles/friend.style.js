import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createFriendStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    friendCountChip: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
      backgroundColor: colors.primaryLight20,
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(4),
      borderRadius: normalize(20),
    },
    requestsSection: {
      paddingVertical: normalize(12),
      paddingBottom: normalize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    requestsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    requestsTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    requestsCount: {
      fontSize: normalize(fontSizes.lg),
      color: colors.primaryDark,
      marginLeft: normalize(6),
      fontFamily: fonts.bold,
    },
    requestsScroll: {
      paddingRight: normalize(24),
    },
    requestCard: {
      width: normalize(120),
      marginRight: normalize(12),
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: normalize(12),
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(8),
      borderWidth: 1,
      borderColor: colors.textLight10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: normalize(2) },
      shadowOpacity: 0.08,
      shadowRadius: normalize(4),
      elevation: 2,
    },
    reqAvatar: {
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(26),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: normalize(8),
    },
    reqAvatarText: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    reqName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    reqUsername: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(10),
    },
    reqButtons: {
      flexDirection: 'row',
      gap: normalize(6),
    },
    reqAcceptBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: normalize(6),
      borderRadius: normalize(8),
      alignItems: 'center',
    },
    reqAcceptText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    reqRejectBtn: {
      flex: 1,
      backgroundColor: colors.disabled,
      paddingVertical: normalize(6),
      borderRadius: normalize(8),
      alignItems: 'center',
    },
    reqRejectText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight70,
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: normalize(16),
      marginVertical: normalize(12),
      backgroundColor: colors.surface,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(10),
    },
    searchIcon: {
      marginRight: normalize(8),
    },
    searchInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      padding: 0,
    },
    listSectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      paddingTop: normalize(14),
      paddingBottom: normalize(8),
    },
    mainScroll: {
      flex: 1,
    },
    mainScrollContent: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(40),
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(12),
    },
    avatar: {
      borderRadius: normalize(23),
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: normalize(12),
    },
    avatarText: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    friendInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      marginBottom: normalize(3),
    },
    friendName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    friendUsername: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    friendSchool: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight70,
    },
    friendIconBtn: {
      width: normalize(36),
      height: normalize(36),
      borderRadius: normalize(18),
      borderWidth: 1.5,
      borderColor: colors.alert,
      justifyContent: 'center',
      alignItems: 'center',
    },
    empty: {
      alignItems: 'center',
      marginTop: normalize(80),
      gap: normalize(12),
    },
    emptyText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayLight,
    },
    bottomSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      paddingHorizontal: normalize(20),
      paddingBottom: normalize(40),
      paddingTop: normalize(12),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: normalize(-2) },
      shadowOpacity: 0.1,
      shadowRadius: normalize(8),
      elevation: 8,
    },
    sheetHandle: {
      width: normalize(40),
      height: normalize(4),
      backgroundColor: colors.border,
      borderRadius: normalize(2),
      alignSelf: 'center',
      marginBottom: normalize(20),
    },
    sheetFriendInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(14),
      marginBottom: normalize(20),
    },
    sheetAvatar: {
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(26),
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetAvatarText: {
      fontSize: normalize(22),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    sheetName: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    sheetUsername: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(2),
    },
    sheetSchool: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    sheetDivider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(16),
    },
    sheetAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(14),
      paddingVertical: normalize(12),
    },
    sheetActionIcon: {
      width: normalize(44),
      height: normalize(44),
      borderRadius: normalize(22),
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteActionIcon: {
      backgroundColor: colors.red,
    },
    blockActionIcon: {
      backgroundColor: colors.disabled,
    },
    sheetActionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      marginBottom: normalize(2),
      color: colors.textPrimary,
    },
    deleteActionTitle: {
      color: colors.alert,
    },
    blockActionTitle: {
      color: colors.textLight70,
    },
    sheetActionSub: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    sheetCancelBtn: {
      marginTop: normalize(16),
      paddingVertical: normalize(14),
      backgroundColor: colors.surface,
      borderRadius: normalize(14),
      alignItems: 'center',
    },
    sheetCancelText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
  });
