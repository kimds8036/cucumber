import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export function createMailStyles(normalize) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, },
    scroll: { flex: 1, backgroundColor: colors.background, },

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
    anonLabel: { fontSize: normalize(fontSizes.lg), fontFamily: fonts.bold, color: colors.textPrimary },
    dotSep: { fontSize: normalize(fontSizes.lg), color: colors.textSecondary },
    mailTime: { fontSize: normalize(fontSizes.md), color: colors.textSecondary },
    mailPreview: { fontSize: normalize(fontSizes.lg), color: colors.textSecondary, marginBottom: normalize(10) },
    cardDivider: { height: 1, backgroundColor: colors.textLight10, marginBottom: normalize(10) },
    mailCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    replyStatus: { flexDirection: 'row', alignItems: 'center', gap: normalize(5) },
    replyStatusDoneText: { fontSize: normalize(fontSizes.md), color: colors.primary },
    replyStatusPendingText: { fontSize: normalize(fontSizes.md), color: colors.textSecondary },

    // 상세 화면 (첫 번째 디자인)
    detailRoot: { flex: 1, backgroundColor: colors.background, },
    detailScroll: { padding: normalize(16), paddingBottom: normalize(32) },
    detailLetterCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      // 경계선 대신 카드 그림자 처리
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
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
    detailAvatarMe: {
      backgroundColor: colors.subcolor,
    },
    detailAvatarOther: {
      backgroundColor: colors.primary,
    },
    detailSenderTexts: { justifyContent: 'center' },
    detailSenderName: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    detailTime: {
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
    },
    typeChip: {
      marginLeft: 'auto',
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(5),
    },
    typeChipText: {
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      fontFamily: fonts.regular,
    },
    detailDivider: {
      height: 0,
      backgroundColor: 'transparent',
      marginBottom: 0,
    },
    detailBody: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
      lineHeight: normalize(22),
    },
    detailNotice: {
      marginBottom: normalize(12),
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    repliedSummary: {
      marginTop: normalize(16),
      alignItems: 'center',
    },
    repliedSummaryText: {
      fontSize: normalize(fontSizes.md),
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
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    bottomCtaDisabled: {
      backgroundColor: colors.primaryLight30,
    },
    bottomWaitingText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(8),
      lineHeight: normalize(20),
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
      flexDirection: 'column',
      // 경계선 대신 카드 그림자 처리 (detailLetterCard와 톤 맞춤)
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
      marginBottom: normalize(16),
    },
    replyFormToLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(10),
    },
    replyFormToName: {
      fontFamily: fonts.bold,
    },
    replyFormInput: {
      minHeight: normalize(80),
      flexGrow: 1,
      flexShrink: 1,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      paddingVertical: 0,
      marginBottom: normalize(8),
    },
    replyFormMetaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginTop: 'auto',
    },
    replyFormCount: {
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      fontFamily: fonts.regular,
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
      fontSize: normalize(fontSizes.md),
      marginRight: normalize(4),
    },
    replyFormChipText: {
      fontSize: normalize(fontSizes.md),
      marginLeft: normalize(4),
      color: colors.textPrimary,
      fontFamily: fonts.regular,
    },
    modalLetterPreviewCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      // 경계선 대신 카드 그림자 처리 (detailLetterCard와 톤 맞춤)
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
      marginTop: normalize(4),
    },
    modalFullNotice: {
      marginTop: normalize(12),
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalFullBottom: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.background,
    },

    // 히스토리 화면
    historyScroll: { flex: 1, backgroundColor: colors.background },
    historyContainer: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(20),
    },
    historyRow: {
      marginBottom: normalize(12),
    },
    historyCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    historyCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(6),
    },
    historyTypeBadge: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    historyTimeText: {
      fontSize: normalize(fontSizes.sm),
      color: colors.textSecondary,
    },
    historyChipRow: {
      flexDirection: 'row',
      marginBottom: normalize(4),
    },
    historyRoleChip: {
      fontSize: normalize(fontSizes.sm),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(3),
      borderRadius: 999,
      overflow: 'hidden',
    },
    historyRoleChipMe: {
      backgroundColor: colors.subcolor,
      color: colors.textPrimary,
    },
    historyRoleChipOther: {
      backgroundColor: colors.primaryLight30,
      color: colors.textPrimary,
    },
    historyCardBody: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      lineHeight: normalize(18),
    },

    // ─── 우편 보내기 화면 ─────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
      },
    section: {
      backgroundColor: colors.background,
      marginHorizontal: 0,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      marginTop: normalize(12),
      borderRadius: normalize(12),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    label: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(12),
    },
    required: {
      color: colors.alert,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      height: normalize(48),
    },
    input: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
      paddingHorizontal: normalize(8),
    },
    resultsContainer: {
      marginTop: normalize(8),
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      borderWidth: normalize(1),
      borderColor: colors.textLight10,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: normalize(16),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight5,
    },
    resultName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    resultId: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    resultAddress: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    studentInfo: {
      flex: 1,
    },
    noResultContainer: {
      padding: normalize(24),
      alignItems: 'center',
    },
    noResultText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    dormantBadge: {
      backgroundColor: colors.red,
      borderRadius: normalize(12),
      paddingVertical: normalize(4),
      paddingHorizontal: normalize(8),
      marginRight: normalize(8),
    },
    dormantBadgeText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    recipientInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      padding: normalize(12),
      borderRadius: normalize(8),
      marginTop: normalize(12),
      gap: normalize(8),
    },
    recipientInfoText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    textAreaWrapper: {
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      padding: normalize(12),
      flex: 1,
    },
    textArea: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
    },
    charCount: {
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: normalize(8),
    },
    buttonContainer: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.background,
    },
    sendButton: {
      backgroundColor: colors.primary,
      paddingVertical: normalize(14),
      borderRadius: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.primaryLight30,
    },
    sendButtonText: {
      color: colors.textWhite,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      // fontWeight 대체
    },

    historyIconWrapper: {
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: 999,
      backgroundColor: colors.background,
    },

    toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: normalize(24) },
    toastCard: { backgroundColor: colors.background, borderRadius: normalize(16), padding: normalize(28), maxWidth: 300, width: '85%', alignItems: 'center' },
    toastIcon: { fontSize: normalize(fontSizes.heading), marginBottom: normalize(12) },
    toastTitle: { fontSize: normalize(fontSizes.xl), fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: normalize(8) },
    toastDesc: { fontSize: normalize(fontSizes.md), color: colors.textSecondary, lineHeight: normalize(20), marginBottom: normalize(18), textAlign: 'center' },
    toastOk: { backgroundColor: colors.primary, borderRadius: normalize(8), paddingVertical: normalize(12), width: '100%', alignItems: 'center' },
    toastOkText: { fontSize: normalize(fontSizes.lg), fontFamily: fonts.bold, color: colors.textWhite },
  });
}

