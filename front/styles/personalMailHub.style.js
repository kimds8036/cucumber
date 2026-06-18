import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createPersonalMailHubStyles = (normalize) => {
  const lottieSize = normalize(450);

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: normalize(16),
    },
    centerStage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: normalize(56),
      paddingBottom: normalize(16),
    },
    /** 우편함 위치 고정 슬롯 — 말풍선은 absolute로만 겹침 */
    mailboxSlot: {
      position: 'relative',
      width: lottieSize,
      height: lottieSize,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    cloudOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: normalize(318),
      alignItems: 'center',
      zIndex: 10,
    },
    cloudRoot: {
      position: 'relative',
      ...shadow.md,
    },
    cloudMenuContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-start',
    },
    optionRow: {
      paddingVertical: normalize(11),
      paddingHorizontal: normalize(4),
    },
    optionDivider: {
      height: StyleSheet.hairlineWidth * 2,
      backgroundColor: colors.primary,
      opacity: 0.35,
    },
    optionRowText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.primaryDark,
      textAlign: 'center',
    },
    mailboxPressable: {
      width: lottieSize,
      height: lottieSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lottie: {
      width: lottieSize,
      height: lottieSize,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(4),
      paddingBottom: normalize(8),
      gap: normalize(8),
    },
    listHeaderBack: {
      padding: normalize(6),
    },
    listHeaderTitle: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
    },
  });
};
