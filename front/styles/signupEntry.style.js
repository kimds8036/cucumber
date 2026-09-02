import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export function createSignupEntryStyles(width, normalize) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: width * 0.07,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: normalize(48),
    },
    wordmark: {
      marginTop: normalize(12),
      fontFamily: fonts.bold,
      fontSize: normalize(18),
      letterSpacing: normalize(2),
      color: colors.textPrimary,
    },
    buttonStack: {
      width: '100%',
      gap: normalize(12),
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: normalize(52),
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
    },
    kakaoButton: {
      backgroundColor: '#FEE500',
    },
    appleButton: {
      backgroundColor: colors.textPrimary,
    },
    phoneButton: {
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    socialButtonDisabled: {
      opacity: 0.45,
    },
    socialButtonText: {
      marginLeft: normalize(8),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
    },
    kakaoButtonText: {
      color: colors.textPrimary,
    },
    appleButtonText: {
      color: colors.textWhite,
    },
    phoneButtonText: {
      color: colors.textPrimary,
    },
    footer: {
      paddingVertical: normalize(24),
      alignItems: 'center',
    },
    footerText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    footerLink: {
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
  });
}
