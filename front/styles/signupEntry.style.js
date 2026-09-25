import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export function createSignupEntryStyles(width, normalize) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
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
      color: colors.text,
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
      borderRadius: normalize(26),
      paddingHorizontal: normalize(16),
    },
    socialButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
    },
    kakaoIcon: {
      width: normalize(18),
      height: normalize(18),
    },
    appleIcon: {
      width: normalize(18),
      height: normalize(30),
    },
    kakaoButton: {
      backgroundColor: '#FEE500',
    },
    appleButton: {
      backgroundColor: colors.text,
    },
    phoneButton: {
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    socialButtonDisabled: {
      opacity: 0.45,
    },
    socialButtonText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
    },
    kakaoButtonText: {
      marginLeft: 0,
      color: colors.text,
    },
    appleButtonText: {
      marginLeft: 0,
      color: colors.white,
    },
    phoneButtonText: {
      color: colors.text,
    },
    footer: {
      paddingVertical: normalize(24),
      alignItems: 'center',
    },
    footerText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
    },
    footerLink: {
      fontFamily: fonts.bold,
      color: colors.text,
    },
  });
}
