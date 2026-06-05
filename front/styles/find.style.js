import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createFindStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: width * 0.04,
    },
    headerSection: {
      paddingTop: normalize(8),
      backgroundColor: colors.background,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: normalize(30),
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: -normalize(4),
      padding: normalize(8),
    },
    headerTitle: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    description: {
      marginTop: normalize(12),
      marginBottom: normalize(14),
      textAlign: 'center',
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
      paddingHorizontal: normalize(8),
    },
    contentSection: {
      flex: 1,
      paddingTop: normalize(8),
    },
    inputLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(8),
      marginLeft: normalize(20),
    },
    inputWrapper: {
      width: '100%',
      alignItems: 'center',
      marginBottom: normalize(8),
    },
    input: {
      width: '98%',
      height: normalize(50),
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: normalize(24),
      paddingHorizontal: normalize(20),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      ...shadow.sm,
    },
    inputReadonly: {
      backgroundColor: colors.textLight5,
      color: colors.textSecondary,
    },
    helperText: {
      marginTop: normalize(2),
      marginBottom: normalize(20),
      marginLeft: normalize(20),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    resultCard: {
      width: '98%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.primaryLight50,
      borderRadius: normalize(20),
      backgroundColor: colors.primaryLight10,
      paddingVertical: normalize(16),
      paddingHorizontal: normalize(16),
      marginTop: normalize(2),
      marginBottom: normalize(16),
    },
    resultTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(6),
    },
    resultValue: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    footerSection: {
      paddingTop: normalize(8),
      paddingBottom: normalize(16),
      backgroundColor: colors.background,
    },
    primaryButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: normalize(14),
    },
    primaryButtonDisabled: {
      backgroundColor: colors.textLight20,
    },
    primaryButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    inputWithButton: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '98%',
      marginBottom: normalize(12),
    },
    inputFlex: {
      flex: 1,
      marginBottom: 0,
      marginRight: normalize(8),
    },
    verifyButton: {
      paddingHorizontal: normalize(18),
      height: normalize(50),
      backgroundColor: colors.primary,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    verifyButtonDisabled: {
      backgroundColor: colors.textLight20,
    },
    verifyButtonWide: {
      width: '98%',
      alignSelf: 'center',
      marginBottom: normalize(12),
    },
    verifyButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    verifiedHint: {
      marginTop: normalize(4),
      marginBottom: normalize(12),
      marginLeft: normalize(20),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primary,
    },
  });
};
