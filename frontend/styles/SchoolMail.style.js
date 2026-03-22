import { StyleSheet, Platform } from 'react-native';
import { colors, fonts } from './colors';

/** 학교 우편함 리스트 (2열 그리드) — schoolMailbox.jsx */
export const createSchoolMailStyles = (width, normalize) => {
  const cardWidth = (width * 0.92 - normalize(8)) / 2;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: normalize(6),
    },
    list: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(8),
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    card: {
      width: cardWidth,
      backgroundColor: '#F8FFF8',
      borderRadius: normalize(14),
      padding: normalize(12),
      marginBottom: normalize(10),
      shadowColor: colors.shadow,
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: normalize(8),
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
      backgroundColor: colors.primaryLight30,
    },
    newBadgeText: {
      fontSize: normalize(10),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    cardPreview: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(18),
      marginBottom: normalize(8),
      minHeight: normalize(36),
    },
    cardFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 'auto',
    },
    cardTime: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
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
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    floatingButton: {
      position: 'absolute',
      right: normalize(20),
      bottom: normalize(50),
      width: normalize(50),
      height: normalize(50),
      borderRadius: normalize(28),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
  });
};

/** 학교 우편 상세 — schoolMailDetail.jsx (detailLetterCard 톤 + boardDetail형 댓글/입력) */
export const createSchoolMailDetailStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    smDetailScrollContent: {
      paddingBottom: normalize(100),
    },
    smDetailLetterWrap: {
      paddingHorizontal: width * 0.05,
      paddingTop: normalize(14),
      paddingBottom: normalize(8),
    },
    /** mail.style detailLetterCard와 유사 + 크림 톤·테두리 */
    smDetailLetterCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      paddingTop: normalize(16),
      paddingBottom: normalize(18),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    smDetailLetterTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: normalize(12),
    },
    smDetailFromToCol: {
      flex: 1,
      paddingRight: normalize(8),
    },
    smDetailFromToText: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: '#7A6B5C',
      lineHeight: normalize(20),
      marginBottom: normalize(2),
    },
    smDetailPostBadge: {
      width: normalize(52),
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(4),
      borderRadius: normalize(8),
      backgroundColor: '#E8F4FC',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#C5DDF0',
    },
    smDetailPostBadgeLabel: {
      fontSize: normalize(10),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginTop: normalize(2),
    },
    smDetailDashedRule: {
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderBottomColor: '#C9B8A8',
      width: '100%',
    },
    smDetailMailBody: {
      fontSize: normalize(15),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(22),
      marginBottom: normalize(16),
      minHeight: normalize(60),
    },
    smDetailMailFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    smDetailMailTime: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    smDetailMailStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(14),
    },
    smDetailStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    smDetailStatText: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // 댓글 영역
    smDetailCommentSection: {
      paddingHorizontal: width * 0.06,
      paddingTop: normalize(8),
      paddingBottom: normalize(10),
    },
    smDetailCommentCountTitle: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(12),
    },
    smDetailCommentBubble: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
      marginBottom: normalize(10),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    /** 대댓글: 왼쪽 들여쓰기(행의 marginLeft) 유지, 오른쪽은 부모 댓글과 동일 선상까지 채움 */
    smDetailCommentBubbleReply: {
      flex: 1,
      minWidth: 0,
      marginRight: 0,
    },
    /** 댓글 달기 포커스 시 말풍선만 강조 */
    smDetailCommentBubbleReplying: {
      backgroundColor: colors.primaryLight20,
    },
    smDetailCommentItem: {
      marginBottom: normalize(6),
    },
    smDetailCommentItemReply: {
      marginBottom: normalize(12),
      marginLeft: normalize(12),
      marginRight: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    smDetailCommentReplyArrow: {
      marginRight: normalize(6),
      marginTop: normalize(2),
    },
    smDetailCommentReplyBody: {
      flex: 1,
    },
    smDetailCommentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: normalize(6),
    },
    smDetailCommentAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    smDetailCommentAuthor: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    smDetailCommentAuthorWriter: {
      fontSize: normalize(12),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    smDetailCommentDot: {
      fontSize: normalize(13),
      color: colors.textSecondary,
      marginHorizontal: normalize(4),
    },
    smDetailCommentTime: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    smDetailCommentBody: {
      fontSize: normalize(14),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(6),
    },
    smDetailCommentTag: {
      color: colors.primary,
      fontFamily: fonts.bold,
    },
    smDetailCommentFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    smDetailCommentFooterLeft: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(12),
      flex: 1,
    },
    smDetailCommentLikeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    smDetailCommentReplyButton: {
      paddingVertical: normalize(4),
      paddingHorizontal: normalize(6),
    },
    smDetailCommentReplyButtonText: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: -normalize(2),
    },
    smDetailLoadMoreRowReply: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingTop: normalize(2),
      paddingBottom: normalize(10),
      paddingRight: normalize(4),
      gap: normalize(4),
      marginLeft: normalize(18),
      marginTop: -normalize(4),
    },
    smDetailLoadMoreText: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // CommentInput 호환 키 (boardDetail과 동일 이름)
    bottomInputRow: {
      flexDirection: 'column',
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
      paddingHorizontal: width * 0.03,
      paddingVertical: normalize(12),
      paddingBottom: Platform.OS === 'ios' ? normalize(34) : normalize(12),
    },
    replyTargetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(6),
      paddingHorizontal: normalize(4),
    },
    replyTargetText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.primary,
      flex: 1,
    },
    replyTargetCancel: {
      padding: normalize(4),
    },
    bottomInputInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(10),
    },
    bottomInput: {
      flex: 1,
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(16),
      borderRadius: normalize(24),
      backgroundColor: colors.textLight5,
      fontSize: normalize(14),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      maxHeight: normalize(80),
    },
    sendButton: {
      width: normalize(44),
      height: normalize(44),
      borderRadius: normalize(22),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
