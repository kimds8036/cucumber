import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createMessageStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // 쪽지/개인우편 토글 영역 (슬라이딩 pill)
    toggleContainer: {
      flexDirection: 'row',
      paddingHorizontal: width * 0.1,
      paddingVertical: normalize(10),
      paddingTop: normalize(8),
      gap: normalize(8),
    },
    toggleTrack: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      borderWidth: 1,
      borderColor: colors.primaryLight50,
      position: 'relative',
      height: normalize(40),
    },
    togglePill: {
      position: 'absolute',
      width: '50%',
      top: 0,
      bottom: 0,
      backgroundColor: colors.primary,
      borderRadius: normalize(18),
      ...shadow.sm,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: normalize(6),
      borderRadius: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    toggleOptionActive: {
      backgroundColor: colors.primary,
    },
    toggleOptionInactive: {
      backgroundColor: colors.transparent,
    },
    toggleOptionText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    toggleOptionTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
    },

    // 메인 내용 영역 (목록 + FAB)
    contentArea: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(10),
    },
    list: {
      flex: 1,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
      backgroundColor: colors.background,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profileCircle: {
      width: normalize(36),
      height: normalize(36),
      borderRadius: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: normalize(12),
    },
    listItemBody: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    listItemName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    listItemContent: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    listItemRight: {
      alignSelf: 'center',
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginLeft: normalize(8),
      minWidth: normalize(48),
      flexShrink: 0,
    },
    listItemTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(4),
    },
    unreadBadge: {
      minWidth: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      backgroundColor: colors.alert,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(4),
    },
    unreadBadgeText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.background,
    },
    floatingButton: {
      position: 'absolute',
      right: normalize(20),
      bottom: normalize(20),
      width: normalize(50),
      height: normalize(50),
      borderRadius: normalize(28),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.lg,
    },
  });
};

// 채팅 화면용 스타일 (Chat.js)
export const createChatStyles = (width, normalize) => {
  return StyleSheet.create({
    chatDivider: {
      height: 1,
      backgroundColor: colors.background2,
      marginHorizontal: width * 0,
      marginVertical: normalize(3),
    },
    chatSectionbox: {
      borderWidth: 1,
    },
    chatSection: {
      paddingHorizontal: width * 0.04,
      paddingTop: normalize(16),
      paddingBottom: 0,
    },
    chatRowOpponent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    chatProfileCircle: {
      width: normalize(38),
      height: normalize(38),
      borderRadius: normalize(19),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: normalize(10),
    },
    /** 프로필 숨긴 연속 메시지: 프로필+마진과 동일 폭으로 말풍선 정렬 */
    chatProfileSpacer: {
      width: normalize(38),
      marginRight: normalize(10),
      alignSelf: 'stretch',
    },
    opponentBody: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    },
    opponentNameAndBubble: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      maxWidth: '75%',
      flexShrink: 1,
      minWidth: 0,
    },
    opponentName: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(3),
      marginLeft: 0,
    },
    opponentBubble: {
      paddingVertical: normalize(5),
      paddingHorizontal: normalize(14),
      borderRadius: normalize(16),
      borderTopLeftRadius: normalize(4),
      borderBottomLeftRadius: normalize(16),
      borderTopRightRadius: normalize(16),
      borderBottomRightRadius: normalize(16),
      backgroundColor: colors.textLight10,
      flexShrink: 1,
      alignSelf: 'flex-start',
    },
    opponentBubbleText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    opponentTimeRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: normalize(4),
      marginTop: normalize(2),
    },
    chatTimeOpponent: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginLeft: normalize(7),
      alignSelf: 'flex-end',
    },
    // 사용자 메시지 행: 좌측 시간, 우측 대화 내용
    chatRowUser: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginBottom: normalize(14),
    },
    userTimeColumn: {
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      marginRight: normalize(7),
      flexShrink: 0,
      alignSelf: 'flex-end',
    },
    chatUnreadCount: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primary,
      marginBottom: normalize(-2),
      marginRight: normalize(4),
    },
    userBubble: {
      paddingVertical: normalize(5),
      paddingHorizontal: normalize(14),
      borderRadius: normalize(16),
      borderBottomRightRadius: normalize(4),
      backgroundColor: colors.primaryLight50,
      flexShrink: 1,
      minWidth: 0,
    },
    userBubbleText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    chatTimeUser: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: -5,
    },

    // ─────────────────────────────────────────────
    // 답장 UI
    // ─────────────────────────────────────────────
    replyPreviewContainer: {
      backgroundColor: colors.surface,
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(8),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    replyPreviewMeta: {
      flex: 1,
    },
    replyPreviewTitle: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    replyPreviewContent: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
      marginTop: 4,
    },

    replyQuoteBox: {
      borderLeftWidth: normalize(3),
      borderLeftColor: colors.primary,
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(10),
      marginBottom: normalize(6),
      borderRadius: normalize(6),
      backgroundColor: colors.textLight10, // 투명 → 연한 배경으로
      opacity: 1,
    },
    replyQuoteSender: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primary,
      marginBottom: normalize(2),
    },
    replyQuoteText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary, // textPrimary → textSecondary로 구분감
    },
  });
};
