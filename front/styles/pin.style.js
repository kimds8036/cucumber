import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createPinStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      paddingTop: normalize(100),
      paddingHorizontal: normalize(24),
    },
    title: {
      fontSize: normalize(fontSizes.xl + 2),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(40),
    },
    dotsRow: {
      flexDirection: 'row',
      gap: normalize(20),
      marginBottom: normalize(12),
    },
    dot: {
      width: normalize(16),
      height: normalize(16),
      borderRadius: normalize(8),
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.transparent,
    },
    dotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dotError: {
      borderColor: colors.alert,
      backgroundColor: colors.transparent,
    },
    dotFilledError: {
      backgroundColor: colors.alert,
      borderColor: colors.alert,
    },
    errorText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.alert,
      textAlign: 'center',
      minHeight: normalize(22),
      marginBottom: normalize(24),
    },
    keypad: {
      marginTop: 'auto',
      marginBottom: normalize(26),
      width: '100%',
      maxWidth: normalize(320),
      alignSelf: 'center',
    },
    keypadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: normalize(13),
    },
    keypadKey: {
      width: normalize(58),
      height: normalize(58),
      alignItems: 'center',
      justifyContent: 'center',
    },
    keypadKeyText: {
      fontSize: normalize(fontSizes.xl + 6),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    keypadKeyPlaceholder: {
      width: normalize(58),
      height: normalize(58),
    },
  });
