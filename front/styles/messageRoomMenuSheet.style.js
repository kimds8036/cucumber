import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

/** Message.jsx 롱프레스 방 메뉴(삭제·차단) — friend.style.js 바텀시트와 동일 규격 */
export const createMessageRoomMenuSheetStyles = (normalize) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayLight,
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      paddingHorizontal: normalize(24),
      paddingBottom: normalize(40),
      paddingTop: normalize(12),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: normalize(4) },
      shadowOpacity: 0.12,
      shadowRadius: normalize(12),
      elevation: 10,
    },
    sheetHandle: {
      width: normalize(40),
      height: normalize(4),
      backgroundColor: colors.border,
      borderRadius: normalize(2),
      alignSelf: 'center',
      marginBottom: normalize(20),
    },
    sheetRoomInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(14),
      marginBottom: normalize(16),
      marginTop: normalize(10),
    },
    sheetAvatar: {
      width: normalize(45),
      height: normalize(45),
      borderRadius: normalize(26),
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetName: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    sheetNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    sheetUsername: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    sheetSubtitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    sheetDeleteAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(12),
      backgroundColor: colors.alertLight,
      borderRadius: normalize(10),
      marginBottom: normalize(10),
    },
    sheetBlockAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(8),
      backgroundColor: colors.background,
      borderRadius: normalize(10),
      marginBottom: normalize(10),
    },
    sheetActionIcon: {
      borderRadius: normalize(22),
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    },
    deleteActionIcon: {
      backgroundColor: colors.transparent,
    },
    blockActionIcon: {
      backgroundColor: colors.transparent,
    },
    sheetDeleteActionTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    sheetBlockActionTitle: {
      fontSize: normalize(fontSizes.xl + 1),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
