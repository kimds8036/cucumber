import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

/** Message.jsx 롱프레스 방 메뉴(삭제·차단) 바텀시트 */
export const createMessageRoomMenuSheetStyles = (normalize) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayLight,
    },
    bottomSheet: {
      width: '95%',
      alignSelf: 'center',
      position: 'absolute',
      bottom: normalize(40),
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: normalize(4) },
      shadowOpacity: 0.12,
      shadowRadius: normalize(12),
      elevation: 10,
    },
    sheetDeleteAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(22),
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    sheetBlockAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(22),
      backgroundColor: colors.background,
      borderRadius: normalize(20),
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
