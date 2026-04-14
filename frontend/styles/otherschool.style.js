import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createOtherSchoolStyles = (normalize) =>
  StyleSheet.create({
    mailboxWideBlock: {
      alignSelf: 'stretch',
      marginBottom: normalize(12),
    },
    mailboxWideButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      alignSelf: 'stretch',
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(15),
      ...shadow.md,
    },
    mailboxWideIconWrap: {
      width: normalize(48),
      height: normalize(48),
      borderRadius: normalize(14),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(14),
    },
    mailboxWideTextCol: {
      flex: 1,
      minWidth: 0,
      minHeight: normalize(48),
      justifyContent: 'center',
    },
    mailboxWideTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      includeFontPadding: false,
    },
    mailboxWideChevronWrap: {
      width: normalize(40),
      height: normalize(48),
      marginLeft: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
