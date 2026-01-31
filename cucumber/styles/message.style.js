import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

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

    // 쪽지/개인우편 토글 영역 (게시판 정렬 버튼과 동일 위치)
    toggleContainer: {
      flexDirection: 'row',
      paddingHorizontal: width * 0.1,
      paddingVertical: normalize(10),
      gap: normalize(8),
    },
    toggleTrack: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      borderWidth: 1,
      borderColor: colors.primaryLight50,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: normalize(6),
      borderRadius: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleOptionActive: {
      backgroundColor: colors.primary,
    },
    toggleOptionInactive: {
      backgroundColor: colors.transparent,
    },
    toggleOptionText: {
      fontSize: normalize(13),
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
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(4),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    profileCircle: {
      width: normalize(40),
      height: normalize(40),
      borderRadius: normalize(24),
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
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    listItemContent: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    listItemRight: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginLeft: normalize(8),
    },
    listItemTime: {
      fontSize: normalize(11),
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
      fontSize: normalize(10),
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
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
      alignItems: 'flex-end',
      marginBottom: normalize(14),
    },
    chatProfileCircle: {
      width: normalize(45),
      height: normalize(45),
      borderRadius: normalize(24),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: normalize(10),
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
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(4),
      marginLeft: normalize(2),
    },
    opponentBubble: {
      paddingVertical: normalize(5),
      paddingHorizontal: normalize(14),
      borderRadius: normalize(16),
      borderBottomLeftRadius: normalize(4),
      backgroundColor: colors.textLight10,
      flexShrink: 1,
      alignSelf: 'flex-start',
    },
    opponentBubbleText: {
      fontSize: normalize(14),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    chatTimeOpponent: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginLeft: normalize(6),
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
      marginRight: normalize(6),
      flexShrink: 0,
    },
    chatUnreadCount: {
      fontSize: normalize(11),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    userBubbleAndTime: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '75%',
      flexShrink: 1,
      minWidth: 0,
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
      fontSize: normalize(14),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    chatTimeUser: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
};
