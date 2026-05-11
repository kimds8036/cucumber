import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createServiceStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: normalize(20),
      paddingTop: normalize(16),
      paddingBottom: normalize(32),
      gap: normalize(8),
    },
    chapterTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(8),
      marginBottom: normalize(2),
    },
    sectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(4),
      marginBottom: normalize(6),
    },
    para: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    bullet: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      paddingLeft: normalize(4),
    },
    divider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginVertical: normalize(6),
    },
    blockquote: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
      marginLeft: normalize(4),
      paddingLeft: normalize(12),
      borderLeftWidth: normalize(3),
      borderLeftColor: colors.textLight10,
      fontStyle: 'italic',
    },
  });
