import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const COMMUTE_CHIP_BG = '#E5F4E0';

export const createCommuteHeaderStyles = (normalize) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COMMUTE_CHIP_BG,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(6),
      marginRight: normalize(4),
      maxWidth: normalize(108),
      gap: normalize(4),
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(3),
    },
    dot: {
      width: normalize(5),
      height: normalize(5),
      borderRadius: normalize(3),
      backgroundColor: colors.primaryDark,
    },
    label: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.textPrimary,
    },
    celebrateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    sparkle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.primaryDark,
    },
  });
