import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const COMMUTE_BANNER_BG = '#E5F4E0';

export const createCommuteBannerStyles = (normalize) =>
  StyleSheet.create({
    wrapper: {
      marginHorizontal: normalize(16),
      marginBottom: normalize(12),
    },
    banner: {
      backgroundColor: COMMUTE_BANNER_BG,
      borderRadius: normalize(16),
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(16),
      minHeight: normalize(52),
      justifyContent: 'center',
      alignItems: 'center',
    },
    inProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    sideIcon: {
      width: normalize(28),
      alignItems: 'center',
    },
    middleTrack: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: normalize(8),
      gap: normalize(6),
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(5),
      marginRight: normalize(8),
    },
    dot: {
      width: normalize(7),
      height: normalize(7),
      borderRadius: normalize(4),
      backgroundColor: colors.primaryDark,
    },
    inProgressText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
    },
    completedText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      textAlign: 'center',
    },
  });
