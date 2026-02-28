import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createTimerStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: width * 0.05,
      paddingTop: normalize(16),
      paddingBottom: normalize(24),
      gap: normalize(16),
    },

    // 스탑워치 카드
    stopwatchCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      paddingVertical: normalize(18),
      paddingHorizontal: normalize(20),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    stopwatchLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(12),
    },
    stopwatchLabel: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    stopwatchSubLabel: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    stopwatchTime: {
      fontSize: normalize(36),
      fontFamily: fonts.bold,
      color: colors.primary,
      textAlign: 'center',
      letterSpacing: 1.5,
      marginBottom: normalize(16),
    },
    stopwatchControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: normalize(16),
    },
    controlButton: {
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(22),
      borderRadius: normalize(22),
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    controlButtonSecondary: {
      backgroundColor: colors.textLight5,
    },
    controlButtonText: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.background,
    },
    controlButtonTextSecondary: {
      color: colors.textPrimary,
    },

    // 친구 섹션
    friendSection: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(20),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    friendHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    friendTitle: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    friendAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
      paddingVertical: normalize(4),
      paddingHorizontal: normalize(8),
      borderRadius: normalize(12),
      backgroundColor: colors.primaryLight30,
    },
    friendAddText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.primary,
    },
    friendListRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    friendAvatarScroll: {
      flexGrow: 0,
    },
    friendAvatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(12),
      paddingRight: normalize(8),
    },
    friendAvatarWrapper: {
      width: normalize(44),
      height: normalize(44),
      borderRadius: normalize(22),
      justifyContent: 'center',
      alignItems: 'center',
    },
    friendAvatar: {
      width: normalize(44),
      height: normalize(44),
      borderRadius: normalize(22),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    friendStatusDot: {
      position: 'absolute',
      right: normalize(1),
      bottom: normalize(1),
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(6),
    },
    friendStatusDotActive: {
      backgroundColor: "#FF9F9F",
    },
    friendStatusDotInactive: {
      backgroundColor: "#E9E9E9",
    },
    friendName: {
      marginTop: normalize(4),
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // 친구 추가 검색
    friendSearchContainer: {
      marginTop: normalize(10),
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    friendSearchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(6),
      gap: normalize(6),
    },
    friendSearchInput: {
      flex: 1,
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    friendSearchButton: {
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(10),
      borderRadius: normalize(12),
      backgroundColor: colors.primary,
    },
    friendSearchButtonText: {
      fontSize: normalize(12),
      fontFamily: fonts.bold,
      color: colors.background,
    },

    // 타임테이블
    timetableSection: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(20),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    timetableTitle: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(10),
    },
    timetableHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(4),
    },
    timetableHourHeader: {
      width: normalize(30),
    },
    timetableMinuteHeaderRow: {
      flexDirection: 'row',
      flex: 1,
    },
    timetableMinuteHeaderCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(2),
    },
    timetableMinuteHeaderText: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    timetableBody: {
      maxHeight: normalize(600),
    },
    timetableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 0.5,
      borderColor: colors.textLight10,
    },
    timetableHourCell: {
      width: normalize(30),
      paddingVertical: normalize(4),
      alignItems: 'center',
      justifyContent: 'center',
    },
    timetableHourText: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    timetableSlotsRow: {
      flexDirection: 'row',
      flex: 1,
    },
    timetableSlotCell: {
      flex: 1,
      height: normalize(16),
      borderLeftWidth: 0.5,
      borderColor: colors.textLight10,
      backgroundColor: colors.background,
    },
    timetableSlotActive: {
      backgroundColor: colors.primaryLight30,
    },
    timetableFooterText: {
      marginTop: normalize(8),
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
};

