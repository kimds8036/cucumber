import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';
export function createMailStyles(normalize) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.white },
    scroll: { flex: 1, backgroundColor: colors.white },

    // 목록
    inboxContainer: {
      padding: normalize(12),
      paddingBottom: normalize(20),
      gap: normalize(8),
    },
    inboxTabRow: {
      flexDirection: 'row',
      paddingHorizontal: normalize(16),
      gap: normalize(8),
      marginBottom: normalize(8),
      paddingTop: normalize(8),
    },
    inboxTabButton: {
      flex: 1,
      paddingVertical: normalize(10),
      borderRadius: normalize(12),
      alignItems: 'center',
    },
    inboxTabButtonText: {
      color: '#444',
    },
    inboxTabButtonTextActive: {
      color: colors.white,
    },
    inboxTabButtonReceivedActive: {
      backgroundColor: colors.primary,
    },
    inboxTabButtonSentActive: {
      backgroundColor: colors.primary,
    },
    inboxTabButtonInactive: {
      backgroundColor: '#EEE',
    },
    inboxStateWrapper: {
      paddingVertical: normalize(20),
      alignItems: 'center',
    },
    inboxErrorText: {
      color: '#E74C3C',
    },
    inboxLoadMoreButton: {
      marginTop: normalize(8),
      alignSelf: 'center',
    },
    inboxLoadMoreText: {
      color: colors.textLight4,
    },
    mailCard: {
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      padding: normalize(16),
      marginBottom: normalize(8),
      borderWidth: 1,
      borderColor: colors.textLight1,
      position: 'relative',
    },
    mailCardUnread: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    mailCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      marginBottom: normalize(8),
    },
    anonLabel: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    dotSep: { fontSize: normalize(fontSizes.xl), color: colors.textLight4 },
    mailTime: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
    },
    mailPreview: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
      marginBottom: normalize(10),
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.textLight1,
      marginBottom: normalize(10),
    },
    mailCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    replyStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(5),
    },
    replyStatusDoneText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.primary,
    },
    replyStatusPendingText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
    },
    mailCardParent: {
      backgroundColor: '#f7f7f7',
    },
    mailCardReply: {
      marginLeft: normalize(14),
      borderLeftWidth: 2,
      borderLeftColor: colors.textLight1,
    },

    // 상세 화면 (첫 번째 디자인)
    detailRoot: { flex: 1, backgroundColor: colors.white },
    detailScroll: { padding: normalize(16) },
    detailLetterCard: {
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      // 경계선 대신 카드 그림자 처리
      ...shadow.md,
    },
    detailLoading: {
      marginTop: normalize(20),
    },
    detailErrorText: {
      color: '#E74C3C',
      textAlign: 'center',
      marginTop: normalize(12),
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
    detailSenderTexts: {
      justifyContent: 'center',
    },
    detailSenderName: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(2),
    },
    detailTime: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
    },
    typeChip: {
      marginLeft: 'auto',
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(5),
    },
    typeChipText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      fontFamily: fonts.regular,
    },
    detailDivider: {
      height: 0,
      backgroundColor: 'transparent',
      marginBottom: 0,
    },
    detailBody: {
      fontSize: normalize(fontSizes.xl),
      color: colors.text,
      lineHeight: normalize(22),
    },
    detailBodyContainer: { flex: 1 },
    detailReplyBodyContainer: { flex: 1 },
    detailEmptyWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    detailEmptyText: {
      color: colors.textLight4,
      marginTop: normalize(8),
    },
    detailReplyBadge: {
      alignSelf: 'flex-start',
      marginLeft: 'auto',
      backgroundColor: colors.primaryLight3,
      borderRadius: 4,
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
      marginBottom: normalize(6),
    },
    detailReplyBadgeText: {
      color: colors.text,
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
    },
    detailNotice: {
      marginBottom: normalize(12),
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      textAlign: 'center',
    },
    repliedSummary: {
      marginTop: normalize(16),
      alignItems: 'center',
    },
    repliedSummaryText: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
    },
    bottomCtaWrapper: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.white,
    },
    bottomCtaButton: {
      backgroundColor: colors.primary,
      borderRadius: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(14),
    },
    bottomCtaText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.white,
    },
    bottomCtaDisabled: {
      backgroundColor: colors.primaryLight4,
    },
    bottomWaitingText: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
      textAlign: 'center',
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(8),
      lineHeight: normalize(20),
    },

    // 답장 화면 (두 번째 디자인 재활용)
    modalFullSafe: { flex: 1, backgroundColor: colors.white },
    modalFullRoot: { flex: 1 },
    modalFullScroll: { flex: 1 },
    modalFullContent: {
      flexGrow: 1,
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(32),
      paddingTop: normalize(16),
    },
    replyFormCard: {
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(10),
      flexDirection: 'column',
      // 경계선 대신 카드 그림자 처리 (detailLetterCard와 톤 맞춤)
      ...shadow.md,
    },
    replyFormToLabel: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(10),
    },
    replyFormToName: {
      fontFamily: fonts.bold,
    },
    replyFormInput: {
      minHeight: normalize(80),
      flexGrow: 1,
      flexShrink: 1,
      fontSize: normalize(fontSizes.xl),
      color: colors.text,
      paddingVertical: 0,
      marginBottom: normalize(4),
    },
    replyFormMetaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    replyFormCount: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      fontFamily: fonts.regular,
      marginTop: normalize(6),
      marginRight: normalize(4),
    },
    replyFormChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(3),
      paddingHorizontal: normalize(10),
      borderRadius: normalize(20),
      backgroundColor: colors.primaryLight4,
    },
    replyFormChipIcon: {
      fontSize: normalize(fontSizes.lg),
      marginRight: normalize(4),
    },
    replyFormChipText: {
      fontSize: normalize(fontSizes.lg),
      marginLeft: normalize(4),
      color: colors.text,
      fontFamily: fonts.regular,
    },
    replyFormChipTextNotice: {
      fontSize: normalize(fontSizes.lg),
      marginLeft: normalize(4),
      color: colors.textLight2,
      fontFamily: fonts.regular,
      textAlign: 'center',
    },
    modalLetterPreviewCard: {
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      // 경계선 대신 카드 그림자 처리 (detailLetterCard와 톤 맞춤)
      ...shadow.md,
    },
    modalFullNotice: {
      marginTop: normalize(12),
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      textAlign: 'center',
    },
    modalFullBottom: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.white,
    },

    // 히스토리 화면
    historyScroll: { flex: 1, backgroundColor: colors.white },
    historyContainer: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(16),
    },
    historyRow: {
      marginBottom: normalize(12),
    },
    // 히스토리 카드: 바깥 = 그림자+테두리, 안쪽 = overflow(액센트 막대 라운드) — 그림자는 바깥에만
    historyCard: {
      borderRadius: normalize(12),
      backgroundColor: colors.white,
      ...shadow.md,
    },
    historyCardInner: {
      borderRadius: normalize(12),
      overflow: 'hidden',
      backgroundColor: colors.white,
    },
    historyCardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    historyCardMain: {
      flex: 1,
      minWidth: 0,
      paddingRight: normalize(8),
    },
    historyNameDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: normalize(8),
    },
    historyCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(6),
    },
    historyTypeBadge: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    historyTimeText: {
      fontSize: normalize(fontSizes.md),
      color: colors.textLight4,
    },
    historyChipRow: {
      flexDirection: 'row',
      marginBottom: normalize(4),
    },
    historyRoleChip: {
      fontSize: normalize(fontSizes.md),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(3),
      borderRadius: 999,
      overflow: 'hidden',
    },
    historyRoleChipMe: {
      backgroundColor: colors.subcolor,
      color: colors.text,
    },
    historyRoleChipOther: {
      backgroundColor: colors.primaryLight4,
      color: colors.text,
    },
    historyCardBody: {
      fontSize: normalize(fontSizes.xl),
      color: colors.text,
      lineHeight: normalize(18),
    },

    // ─── 우편 보내기 화면 ─────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.white,
    },
    section: {
      backgroundColor: colors.white,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(16),
      marginBottom: normalize(12),
      borderRadius: normalize(12),
      ...shadow.md,
    },
    label: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(12),
    },
    required: {
      color: colors.alert,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(8),
      paddingHorizontal: normalize(12),
      height: normalize(48),
    },
    input: {
      flex: 1,
      fontSize: normalize(fontSizes.xxl),
      color: colors.text,
      paddingHorizontal: normalize(4),
    },
    resultsContainer: {
      marginTop: normalize(8),
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      borderWidth: normalize(1),
      borderColor: colors.textLight1,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: normalize(16),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight1,
    },
    resultName: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(4),
    },
    resultId: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    resultAddress: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
    },
    studentInfo: {
      flex: 1,
    },
    noResultContainer: {
      padding: normalize(24),
      alignItems: 'center',
    },
    noResultText: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
    },
    // SendMail 전용 레이아웃
    sendScrollContent: {
      flexGrow: 1,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(16),
    },
    loadingBelowInput: {
      marginTop: normalize(8),
    },
    sendInlineErrorText: {
      marginTop: normalize(8),
      color: '#E74C3C',
      fontSize: normalize(12),
    },
    sendInlineHelperText: {
      marginTop: normalize(8),
      color: colors.textLight4,
      fontSize: normalize(12),
      textAlign: 'center',
    },
    recipientFieldsRow: {
      flexDirection: 'row',
      gap: normalize(8),
    },
    recipientFieldWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: normalize(48),
    },
    recipientGradeClassInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    namerecipientFieldWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(8),
      paddingHorizontal: normalize(10),
      height: normalize(48),
    },
    recipientSubField: {
      flex: 1,
      height: normalize(48),
      justifyContent: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(8),
    },
    recipientFieldInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      color: colors.text,
      textAlign: 'center',
      paddingHorizontal: normalize(2),
    },
    homonymNoticeText: {
      marginTop: normalize(10),
      fontSize: normalize(fontSizes.lg),
      color: colors.alert,
      fontFamily: fonts.regular,
      lineHeight: normalize(20),
    },
    mailReturnedBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.red,
      borderRadius: normalize(99),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(4),
    },
    mailReturnedBadgeRowEnd: {
      marginLeft: 'auto',
      alignSelf: 'center',
    },
    mailReturnedBadgeText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    resendLinkButton: {
      marginTop: normalize(4),
      alignSelf: 'flex-start',
    },
    resendLinkButtonText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    sendMetaRight: {
      marginLeft: 'auto',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },
    dormantBadge: {
      backgroundColor: colors.red,
      borderRadius: normalize(12),
      paddingVertical: normalize(4),
      paddingHorizontal: normalize(8),
      marginRight: normalize(8),
    },
    dormantBadgeText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    recipientInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      padding: normalize(12),
      borderRadius: normalize(8),
      marginTop: normalize(12),
      gap: normalize(8),
    },
    recipientInfoText: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
    },
    textAreaWrapper: {
      backgroundColor: colors.textLight1,
      borderRadius: normalize(12),
      padding: normalize(12),
      flex: 1,
    },
    textArea: {
      flex: 1,
      fontSize: normalize(fontSizes.xxl),
      color: colors.text,
    },
    charCount: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      textAlign: 'right',
      marginTop: normalize(8),
    },
    buttonContainer: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.white,
    },
    sendButton: {
      backgroundColor: colors.primary,
      paddingVertical: normalize(14),
      borderRadius: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.primaryLight4,
    },
    sendButtonText: {
      color: colors.white,
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      // fontWeight 대체
    },

    historyIconWrapper: {
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: 999,
      backgroundColor: colors.white,
    },

    toastOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: normalize(24),
    },
    toastCard: {
      backgroundColor: colors.white,
      borderRadius: normalize(16),
      padding: normalize(28),
      maxWidth: 300,
      width: '85%',
      alignItems: 'center',
    },
    toastIcon: {
      fontSize: normalize(fontSizes.heading + 6),
      marginBottom: normalize(12),
    },
    toastTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(8),
    },
    toastDesc: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      lineHeight: normalize(20),
      marginBottom: normalize(18),
      textAlign: 'center',
    },
    toastOk: {
      backgroundColor: colors.primary,
      borderRadius: normalize(8),
      paddingVertical: normalize(12),
      width: '100%',
      alignItems: 'center',
    },
    toastOkText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.white,
    },
  });
}
