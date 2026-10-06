import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';
/** 학교 우편함 리스트 (2열 그리드) — schoolMailbox.jsx */
export const createSchoolMailStyles = (width, normalize) => {
  const cardWidth = (width * 0.92 - normalize(8)) / 2;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.white,
    },
    container: {
      flex: 1,
      backgroundColor: colors.white,
      paddingTop: normalize(8),
    },
    list: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(8),
    },
    gridContainer: {
      paddingBottom: normalize(20),
    },
    card: {
      width: cardWidth,
      minHeight: normalize(150),
      flexDirection: 'column',
      backgroundColor: colors.white,
      borderRadius: normalize(14),
      padding: normalize(12),
      marginBottom: normalize(10),
      ...shadow.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(8),
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    cardFromLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      flexShrink: 1,
    },
    cardMetaDot: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      marginHorizontal: normalize(4),
    },
    cardIconWrap: {
      position: 'relative',
    },
    cardEnvelope: {
      color: colors.primary,
    },
    cardNewArrow: {
      position: 'absolute',
      right: -normalize(2),
      top: -normalize(1),
    },
    newBadge: {
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryLight4,
    },
    newBadgeText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    cardPreview: {
      flexGrow: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      lineHeight: normalize(fontSizes.title),
      marginBottom: normalize(10),
    },
    cardFooterRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: 'auto',
    },
    cardTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(2),
    },
    statText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
  });
};

/** 학교 우편 보내기 화면 — sendSchoolMailScreen.jsx */
export const createSendSchoolMailStyles = (normalize) =>
  StyleSheet.create({
    schoolSendOuter: {
      flex: 1,
      backgroundColor: colors.white,
    },
    schoolSendSafe: {
      flex: 1,
      backgroundColor: colors.white,
    },
    schoolSendKeyboard: {
      flex: 1,
      backgroundColor: colors.white,
    },
    schoolSendScroll: {
      flex: 1,
    },
    schoolSendScrollContent: {
      flexGrow: 1,
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(24),
    },
    schoolSendSection: {
      marginTop: normalize(12),
    },
    schoolSendFieldLabel: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(8),
    },
    schoolSendFixedSchoolBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(12),
      gap: normalize(8),
    },
    schoolSendFixedSchoolTexts: {
      flex: 1,
    },
    schoolSendFixedSchoolName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    schoolSendBodyWrap: {
      flex: 1,
      minHeight: normalize(220),
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.textLight1,
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(12),
    },
    schoolSendBodyInput: {
      flex: 1,
      minHeight: normalize(150),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      textAlignVertical: 'top',
    },
    schoolSendMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: normalize(10),
    },
    schoolSendCharCount: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      marginBottom: normalize(6),
    },
    schoolSendAdChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
      backgroundColor: colors.textLight1,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
    },
    schoolSendAdChipText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    schoolSendCtaBar: {
      paddingHorizontal: normalize(16),
      paddingBottom: Platform.OS === 'ios' ? normalize(22) : normalize(12),
      backgroundColor: colors.white,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.textLight1,
    },
    schoolSendCtaBtn: {
      height: normalize(48),
      borderRadius: normalize(14),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    schoolSendCtaBtnDisabled: {
      backgroundColor: colors.textLight1,
    },
    schoolSendCtaLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
  });
