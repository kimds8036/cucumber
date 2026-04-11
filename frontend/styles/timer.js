import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

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
      paddingTop: normalize(8),
      paddingBottom: normalize(24),
      gap: normalize(16),
    },
    dateBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    dateBarText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      minWidth: normalize(100),
      textAlign: 'center',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
      paddingHorizontal: normalize(12),
    },
    saveBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.primary,
    },

    // 친구 스토리 스타일
    friendStoryScroll: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingBottom: normalize(8),
      paddingRight: normalize(16),
    },
    friendStoryAddCircleWrap: {
      alignItems: 'center',
      marginRight: normalize(14),
      width: normalize(56),
    },
    friendStoryAddCircle: {
      width: normalize(56),
      height: normalize(56),
      borderRadius: normalize(28),
      backgroundColor: colors.textLight5,
      borderWidth: 2,
      borderColor: colors.primaryLight30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    friendStoryAddLabel: {
      marginTop: normalize(4),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    friendStoryCircleWrap: {
      alignItems: 'center',
      marginRight: normalize(14),
      width: normalize(56),
      position: 'relative',
    },
    friendStoryCircle: {
      width: normalize(56),
      height: normalize(56),
      borderRadius: normalize(28),
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    friendStatusDotOnCircle: {
      position: 'absolute',
      top: normalize(40),
      right: normalize(1),
      bottom: normalize(-3),
      width: normalize(12),
      height: normalize(12),
      borderRadius: normalize(6),
    },
    friendStoryName: {
      marginTop: normalize(4),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: normalize(56),
    },

    // 타이머 블록 (시·분·초)
    timerBlock: {
      alignItems: 'center',
      paddingVertical: normalize(20),
      paddingHorizontal: normalize(16),
    },
    timerTime: {
      fontSize: normalize(fontSizes.heading + 15),
      fontFamily: fonts.bold,
      color: colors.primary,
      letterSpacing: 2,
      marginBottom: normalize(8),
    },
    timerHint: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(16),
    },
    timerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(20),
      borderRadius: normalize(24),
      backgroundColor: colors.primary,
    },
    timerBtnPause: {
      backgroundColor: colors.textLight5,
    },
    timerBtnText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    timerBtnTextPause: {
      color: colors.textPrimary,
    },

    // 구분선
    divider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(10),
    },

    // 투두 + 타임테이블 수평 배치
    todoTimetableRow: {
      flexDirection: 'row',
      flex: 1,
      minHeight: normalize(320),
      gap: normalize(12),
    },
    todoColumn: {
      flex: 1,
      minWidth: width * 0.5,
      maxWidth: width * 0.6,
    },
    todoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(10),
    },
    todoTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: 0,
    },
    todoHeaderButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(8),
    },
    todoAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(6),
      borderRadius: normalize(10),
      backgroundColor: colors.green,
      gap: normalize(4),
    },
    todoAddBtnText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primary,
    },
    todoList: {
      maxHeight: normalize(400),
    },
    subjectBlock: {
      marginBottom: normalize(14),
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(6),
    },
    subjectColorBar: {
      width: normalize(4),
      height: normalize(36),
      borderRadius: 2,
      marginRight: normalize(8),
    },
    subjectBody: {
      flex: 1,
    },
    subjectName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    subjectTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    subjectStartBtn: {
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(12),
      borderRadius: normalize(12),
      backgroundColor: colors.primary,
    },
    subjectPlayBtn: {
      width: normalize(36),
      height: normalize(36),
      borderRadius: normalize(18),
      justifyContent: 'center',
      alignItems: 'center',
    },
    subjectPlayBtnActive: {
      opacity: 0.9,
    },
    subjectCollapseBtn: {
      padding: normalize(4),
      justifyContent: 'center',
      alignItems: 'center',
    },
    subjectStartBtnActive: {
      backgroundColor: colors.primaryDark,
    },
    subjectStartBtnText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: normalize(12),
      paddingVertical: normalize(6),
      marginBottom: normalize(4),
      gap: normalize(8),
    },
    taskCheckbox: {
      width: normalize(22),
      height: normalize(22),
      borderRadius: normalize(4),
      borderWidth: 2,
      borderColor: colors.textLight20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    taskCheckboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    taskContent: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    taskContentDone: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    todoAddUnderSubject: {
      paddingVertical: normalize(6),
      paddingLeft: normalize(12),
      marginBottom: normalize(8),
    },
    todoAddUnderSubjectText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    taskStatusRow: {
      flexDirection: 'row',
      gap: normalize(4),
    },
    taskStatusBtn: {
      width: normalize(26),
      height: normalize(26),
      borderRadius: normalize(13),
      backgroundColor: colors.textLight10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    taskStatusDone: {
      backgroundColor: colors.primary,
    },
    taskStatusFail: {
      backgroundColor: colors.alert,
    },
    taskStatusPending: {
      backgroundColor: colors.textSecondary,
    },
    taskStatusText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    timetableColumn: {
      flex: 1,
      minWidth: width * 0.4,
    },
    timetableScroll: {
      maxHeight: normalize(600),
    },
    stopwatchCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      paddingVertical: normalize(18),
      paddingHorizontal: normalize(20),
      ...shadow.md,
    },
    stopwatchLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(12),
    },
    stopwatchLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    stopwatchSubLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    stopwatchTime: {
      fontSize: normalize(fontSizes.heading + 6),
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
      fontSize: normalize(fontSizes.xl),
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
      ...shadow.sm,
    },
    friendHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    friendTitle: {
      fontSize: normalize(fontSizes.xxl),
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
      fontSize: normalize(fontSizes.lg),
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
      backgroundColor: '#4CAF50',
    },
    friendStatusDotInactive: {
      backgroundColor: '#E9E9E9',
    },
    friendName: {
      marginTop: normalize(4),
      fontSize: normalize(fontSizes.lg),
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
      fontSize: normalize(fontSizes.xl),
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
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.background,
    },

    // 타임테이블
    timetableSection: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(20),
      ...shadow.sm,
    },
    timetableTitle: {
      fontSize: normalize(fontSizes.xxl),
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
      fontSize: normalize(fontSizes.lg),
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
      fontSize: normalize(fontSizes.lg),
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
      overflow: 'hidden',
      flexDirection: 'row',
    },
    timetableSlotProgress: {
      flex: 0,
      minWidth: 0,
    },
    timetableSlotSegment: {
      minWidth: 0,
    },
    timetableSlotActive: {
      backgroundColor: colors.primaryLight30,
    },
    timetableFooterText: {
      marginTop: normalize(8),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // 저장용 플래너 캡처 (좌: 날짜/시간/투두, 우: 타임테이블, 버튼 없음)
    plannerCaptureWrap: {
      width: width,
      backgroundColor: colors.background,
      paddingVertical: normalize(16),
    },
    plannerCaptureRow: {
      flexDirection: 'row',
      flex: 1,
    },
    plannerLeftColumn: {
      width: width * 0.6,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(8),
      borderRightWidth: 1,
      borderColor: colors.textLight10,
    },
    plannerRightColumn: {
      flex: 1,
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(8),
    },
    plannerLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(4),
    },
    plannerValue: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(12),
    },
    plannerMemoLine: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(16),
    },
    plannerTodoTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(10),
    },
    plannerSubjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(6),
    },
    plannerSubjectColorBar: {
      width: normalize(4),
      height: normalize(28),
      borderRadius: 2,
      marginRight: normalize(6),
    },
    plannerSubjectBody: {
      flex: 1,
    },
    plannerSubjectName: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    plannerSubjectTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    plannerTaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: normalize(14),
      paddingVertical: normalize(4),
      marginBottom: normalize(2),
      gap: normalize(8),
    },
    plannerTaskCheckbox: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(4),
      borderWidth: 2,
      borderColor: colors.textLight20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    plannerTaskCheckboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    plannerTaskContent: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    plannerTaskContentDone: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
  });
};
