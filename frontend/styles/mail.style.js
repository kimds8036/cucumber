import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

export function createMailStyles(normalize) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8F9FA' },
    scroll: { flex: 1 },

    // 목록
    inboxContainer: { padding: normalize(12), paddingBottom: normalize(20), gap: normalize(8) },
    mailCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(16),
      marginBottom: normalize(8),
      borderWidth: 1,
      borderColor: colors.textLight10,
      position: 'relative',
    },
    mailCardUnread: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    mailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(8) },
    anonLabel: { fontSize: normalize(13), fontFamily: fonts.bold, color: colors.textPrimary },
    dotSep: { fontSize: normalize(13), color: colors.textSecondary },
    mailTime: { fontSize: normalize(12), color: colors.textSecondary },
    mailPreview: { fontSize: normalize(14), color: colors.textSecondary, marginBottom: normalize(10) },
    cardDivider: { height: 1, backgroundColor: colors.textLight10, marginBottom: normalize(10) },
    mailCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    replyStatus: { flexDirection: 'row', alignItems: 'center', gap: normalize(5) },
    replyStatusDoneText: { fontSize: normalize(12), color: colors.primary },
    replyStatusPendingText: { fontSize: normalize(12), color: colors.textSecondary },

    // 상세 화면 (첫 번째 디자인)
    detailRoot: { flex: 1 },
    detailScroll: { padding: normalize(16), paddingBottom: normalize(32) },
    detailLetterCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    detailSenderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(14),
    },
    detailAvatar: {
      width: normalize(32),
      height: normalize(32),
      borderRadius: normalize(16),
      backgroundColor: colors.primary,
      marginRight: normalize(10),
    },
    detailSenderTexts: { justifyContent: 'center' },
    detailSenderName: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    detailTime: {
      fontSize: normalize(11),
      color: colors.textSecondary,
    },
    detailDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(16),
    },
    detailBody: {
      fontSize: normalize(15),
      color: colors.textPrimary,
      lineHeight: normalize(22),
    },
    detailNotice: {
      marginTop: normalize(12),
      fontSize: normalize(11),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    repliedSummary: {
      marginTop: normalize(16),
      alignItems: 'center',
    },
    repliedSummaryText: {
      fontSize: normalize(12),
      color: colors.textSecondary,
    },
    bottomCtaWrapper: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.background,
    },
    bottomCtaButton: {
      backgroundColor: colors.primary,
      borderRadius: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(14),
    },
    bottomCtaText: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    bottomCtaDisabled: {
      backgroundColor: colors.primaryLight30,
    },

    // 답장 화면 (두 번째 디자인 재활용)
    modalFullSafe: { flex: 1, backgroundColor: colors.background },
    modalFullRoot: { flex: 1 },
    modalFullScroll: { flex: 1 },
    modalFullContent: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(24),
      paddingTop: normalize(12),
    },
    replyFormCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(14),
      borderWidth: 1,
      borderColor: colors.textLight10,
      marginBottom: normalize(16),
    },
    replyFormToLabel: {
      fontSize: normalize(13),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(10),
    },
    replyFormToName: {
      fontFamily: fonts.bold,
    },
    replyFormInput: {
      minHeight: normalize(80),
      fontSize: normalize(14),
      color: colors.textPrimary,
      paddingVertical: 0,
      marginBottom: normalize(8),
    },
    replyFormMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: normalize(4),
    },
    replyFormCount: {
      fontSize: normalize(11),
      color: colors.textSecondary,
    },
    replyFormChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(3),
      paddingHorizontal: normalize(10),
      borderRadius: normalize(20),
      backgroundColor: colors.primaryLight30,
    },
    replyFormChipIcon: {
      fontSize: normalize(11),
      marginRight: normalize(4),
    },
    replyFormChipText: {
      fontSize: normalize(11),
      color: colors.textPrimary,
    },
    modalLetterPreviewCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      borderWidth: 1,
      borderColor: colors.textLight10,
      marginTop: normalize(4),
    },
    modalFullNotice: {
      marginTop: normalize(12),
      fontSize: normalize(11),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalFullBottom: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.textLight10,
      backgroundColor: colors.background,
    },

    toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: normalize(24) },
    toastCard: { backgroundColor: colors.background, borderRadius: normalize(16), padding: normalize(28), maxWidth: 300, width: '85%', alignItems: 'center' },
    toastIcon: { fontSize: normalize(36), marginBottom: normalize(12) },
    toastTitle: { fontSize: normalize(16), fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: normalize(8) },
    toastDesc: { fontSize: normalize(12), color: colors.textSecondary, lineHeight: normalize(20), marginBottom: normalize(18), textAlign: 'center' },
    toastOk: { backgroundColor: colors.primary, borderRadius: normalize(8), paddingVertical: normalize(12), width: '100%', alignItems: 'center' },
    toastOkText: { fontSize: normalize(14), fontFamily: fonts.bold, color: colors.textWhite },
  });
}

