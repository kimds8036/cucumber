import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export function createSignupEntryStyles(width, normalize) {
  return StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: normalize(12),
      paddingHorizontal: Math.max(normalize(20), Math.round(width * 0.055)),
    },
    brand: {
      alignItems: 'center',
      marginBottom: normalize(28),
    },
    title: {
      marginTop: normalize(12),
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.heading),
      color: colors.textPrimary,
    },
    titleEn: {
      marginTop: normalize(2),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      letterSpacing: 0.4,
    },
    subtitle: {
      marginTop: normalize(8),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
      textAlign: 'center',
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
      gap: normalize(8),
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
      ...shadow.sm,
    },
    appleButton: {
      backgroundColor: '#000000',
      ...shadow.sm,
    },
    phoneButton: {
      backgroundColor: colors.background,
      ...shadow.sm,
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
      color: '#000000',
    },
    appleButtonText: {
      marginLeft: 0,
      color: colors.textWhite,
    },
    phoneButtonText: {
      color: colors.textPrimary,
    },
    footer: {
      paddingVertical: normalize(20),
      alignItems: 'center',
    },
    footerText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    footerLink: {
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
  });
}
