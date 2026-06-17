import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createPersonalMailHubStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: normalize(16),
    },
    lottieWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: normalize(8),
      marginBottom: normalize(4),
    },
    lottie: {
      width: normalize(240),
      height: normalize(240),
    },
    dialogueScroll: {
      flex: 1,
    },
    dialogueContent: {
      paddingBottom: normalize(24),
      gap: normalize(10),
    },
    bubbleRow: {
      flexDirection: 'row',
      width: '100%',
    },
    bubbleRowMailbox: {
      justifyContent: 'flex-start',
    },
    bubbleRowUser: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: normalize(18),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(10),
    },
    bubbleMailbox: {
      backgroundColor: colors.background2,
      borderTopLeftRadius: normalize(4),
    },
    bubbleUser: {
      backgroundColor: colors.primaryLight20,
      borderTopRightRadius: normalize(4),
      borderWidth: 1,
      borderColor: colors.primary,
    },
    bubbleText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    bubbleTextUser: {
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    optionButton: {
      maxWidth: '82%',
      borderRadius: normalize(18),
      borderTopRightRadius: normalize(4),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(10),
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    optionButtonText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.primaryDark,
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
