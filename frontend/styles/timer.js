import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

/** 모달 시트 상단 — colors.shadow 기준 (tokens.shadow 와 동일 톤) */
const friendModalSheetShadow = (normalize) =>
  Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: normalize(2) },
      shadowOpacity: 0.12,
      shadowRadius: normalize(4),
    },
    android: { elevation: 4 },
  });

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
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.primary,
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    friendStatusDotOnCircle: {
      position: 'absolute',
      top: normalize(43),
      right: normalize(3),
      bottom: normalize(-3),
      width: normalize(12),
      height: normalize(12),
      borderRadius: normalize(6),
    },
    friendStoryName: {
      marginTop: normalize(4),
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(20),
      height: normalize(20),
      includeFontPadding: false,
      textAlignVertical: 'center',
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: normalize(56),
    },

    // 타이머 상자 — 학교탭 급식 `mealSectionCard`와 동일 톤(배경·radius·shadow.md)
    timerCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(16),
      marginBottom: normalize(10),
      ...shadow.md,
    },
    // 타이머 블록 (시·분·초) — 카드 안 정렬
    timerBlock: {
      alignItems: 'center',
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(6),
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
      alignItems: 'stretch',
    },
    todoColumn: {
      flex: 1,
      minWidth: width * 0.5,
      maxWidth: width * 0.6,
      alignSelf: 'stretch',
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
      color: colors.primaryDark,
    },
    todoList: {
      flex: 1,
    },
    subjectAccordionWrap: {
      overflow: 'hidden',
      borderRadius: normalize(12),
    },
    subjectBlock: {
      marginBottom: normalize(8),
      borderRadius: normalize(12),
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
    },
    subjectColorBar: {
      width: normalize(4),
      alignSelf: 'stretch',
      minHeight: normalize(36),
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
      marginTop: normalize(2),
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
      color: colors.background,
    },
    subjectTasksArea: {
      backgroundColor: colors.background || colors.background,
      paddingVertical: normalize(6),
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
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
      width: normalize(18),
      height: normalize(18),
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
      paddingLeft: normalize(18),
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
      alignSelf: 'stretch',
    },
    timetableScroll: {
      // 높이 제한을 없애 전체 페이지 스크롤에서 00~05까지 노출
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
      right: normalize(3),
      bottom: normalize(1),
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(6),
    },
    friendStatusDotActive: {
      backgroundColor: '#7ACC5E',
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
      fontSize: normalize(fontSizes.xl),
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
      marginBottom: normalize(2),
    },
    plannerValue: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(8),
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
    /** @timer.jsx */
    dateBarNavBtn: {
      padding: normalize(4),
    },
    dateBarDateTouch: {
      minWidth: normalize(100),
    },
    plannerCaptureOffscreen: {
      position: 'absolute',
      left: -width * 2,
      top: 0,
      width,
    },
    viewShotBg: {
      backgroundColor: colors.background,
    },
    plannerSubjectListItem: {
      marginBottom: normalize(10),
    },
    timerSkelFriendName: {
      marginTop: normalize(4),
    },
    timerSkelDateLine1: {
      alignSelf: 'center',
      marginBottom: normalize(10),
    },
    timerSkelDateLine2: {
      alignSelf: 'center',
      marginBottom: normalize(16),
    },
    timerSkelTimerBtn: {
      alignSelf: 'center',
    },
    timerSkelColTitle: {
      marginBottom: normalize(10),
    },
    timerSkelTaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(10),
      gap: normalize(8),
    },
    timerSkelTtTitle: {
      marginBottom: normalize(10),
    },
    timerSkelTtRow: {
      marginBottom: normalize(8),
    },
    safeAreaFlex: {
      flex: 1,
    },
  });
};

/** timerFriendModals.jsx — PokeModal / AddFriendModal 전용 */
export const createTimerFriendModalStyles = (normalize) =>
  StyleSheet.create({
    pokeOverlay: {
      flex: 1,
      backgroundColor: colors.overlayLight,
    },
    pokeWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    pokePopup: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      paddingHorizontal: normalize(24),
      paddingBottom: normalize(40),
      paddingTop: normalize(12),
      ...friendModalSheetShadow(normalize),
    },
    pokeHandle: {
      width: normalize(40),
      height: normalize(4),
      backgroundColor: colors.border,
      borderRadius: normalize(2),
      alignSelf: 'center',
      marginBottom: normalize(20),
    },
    pokeFriendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(14),
      marginBottom: normalize(16),
      marginTop: normalize(10),
    },
    pokeFriendTextBox: {
      minHeight: normalize(52),
      justifyContent: 'center',
      flexShrink: 1,
    },
    pokeAvatar: {
      borderRadius: normalize(26),
      justifyContent: 'center',
      alignItems: 'center',
    },
    pokeStudyingBadge: {
      position: 'absolute',
      bottom: normalize(2),
      right: normalize(0),
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(8),
      backgroundColor: '#7ACC5E',
    },
    pokeIdleBadge: {
      position: 'absolute',
      bottom: normalize(2),
      right: normalize(0),
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(8),
      backgroundColor: '#E9E9E9',
    },
    pokeFriendName: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      lineHeight: normalize(24),
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    pokeFriendNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    pokeFriendUsername: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
      includeFontPadding: false,
    },
    pokeStatusText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: normalize(4),
      lineHeight: normalize(20),
      includeFontPadding: false,
    },
    pokeOutsideDescWrap: {
      alignItems: 'center',
      paddingHorizontal: normalize(24),
      marginBottom: normalize(8),
    },
    pokeOutsideDesc: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.background,
      lineHeight: normalize(24),
      includeFontPadding: false,
      textAlign: 'center',
    },
    pokeOutsideDescHighlight: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.greenDark,
    },
    pokeOutsideDescRest: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.background,
    },
    pokeDivider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(16),
    },
    pokeInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.green,
      borderRadius: normalize(14),
      padding: normalize(14),
      gap: normalize(12),
      marginBottom: normalize(16),
    },
    pokeInfoEmoji: {
      fontSize: normalize(fontSizes.heading + 5),
      color: colors.primary,
    },
    pokeInfoTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.primary,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    pokeInfoDesc: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.background2,
      lineHeight: normalize(16),
    },
    pokePrimaryBtn: {
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(20),
      paddingVertical: normalize(12),
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    pokePrimaryBtnContent: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(16),
      gap: normalize(12),
    },
    pokePrimaryBtnTextGroup: {
      flex: 1,
      alignItems: 'center',
    },
    pokePrimaryBtnText: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    // 쿡 찌르기 전용 버튼
    pokeActionBtn: {
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(10),
      paddingVertical: normalize(14),
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    pokeActionBtnContent: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(14),
      gap: normalize(6),
    },
    pokeActionBtnText: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.primary,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    pokeMessageBtn: {
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(20),
      paddingVertical: normalize(12),
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    // 메시지 보내기 전용 버튼
    pokeMessageActionBtn: {
      backgroundColor: colors.textLight5,
      borderRadius: normalize(10),
      paddingVertical: normalize(8),
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    pokeMessageActionBtnContent: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(16),
      gap: normalize(6),
    },
    pokeMessageActionBtnText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.background2,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    pokeMessageBtnContent: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: normalize(14),
      gap: normalize(12),
    },
    pokeMessageBtnIcon: {
      color: colors.background2,
      fontSize: normalize(fontSizes.xxl),
      alignSelf: 'center',
      paddingHorizontal: normalize(4),
    },
    pokeNotificationBtnIcon: {
      color: colors.primary,
      fontSize: normalize(fontSizes.heading),
      alignSelf: 'center',
      paddingHorizontal: normalize(2),
    },
    pokeMessageBtnTextGroup: {
      flex: 1,
      alignItems: 'flex-start',
    },
    pokeMessageBtnText: {
      color: colors.background,
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      alignSelf: 'flex-start',
      textAlign: 'left',
      paddingHorizontal: normalize(14),
    },
    pokeCancelBtn: {
      paddingVertical: normalize(12),
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(20),
    },
    pokeCancelBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },

    addFriendOverlay: {
      flex: 1,
      backgroundColor: colors.transparent,
    },
    addFriendWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    addFriendPopup: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      paddingHorizontal: normalize(24),
      paddingBottom: normalize(30),
      paddingTop: normalize(12),
      ...friendModalSheetShadow(normalize),
    },
    addFriendHandle: {
      width: normalize(40),
      height: normalize(4),
      backgroundColor: colors.border,
      borderRadius: normalize(2),
      alignSelf: 'center',
      marginBottom: normalize(20),
    },
    addFriendTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(10),
      marginTop: normalize(10),
    },
    addFriendSubtitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    addFriendInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
      gap: normalize(8),
      marginBottom: normalize(16),
    },
    addFriendInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      padding: 0,
    },
    addFriendPrimaryBtn: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: normalize(14),
      paddingVertical: normalize(14),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(10),
    },
    addFriendPrimaryBtnDisabled: {
      opacity: 0.4,
    },
    addFriendPrimaryBtnIcon: {
      marginRight: normalize(6),
    },
    addFriendPrimaryBtnText: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    addFriendCancelBtn: {
      paddingVertical: normalize(12),
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: normalize(14),
    },
    addFriendCancelBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
  });

/** timerModals.jsx — AddSubjectModal / AddTaskModal / CalendarModal */
export const createTimerModalsStyles = (normalize) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlayLight,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    centered: {
      width: '86%',
    },
    bottomSheetContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
    },
    centeredJustify: {
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: normalize(18),
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(18),
    },
    bottomSheetCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      paddingHorizontal: normalize(18),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
    },
    cardMaxWidth: {
      maxWidth: normalize(360),
    },
    title: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(10),
    },
    label: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginBottom: normalize(6),
    },
    labelNoMargin: {
      marginBottom: 0,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(8),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(12),
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    inputMultiline: {
      minHeight: normalize(60),
      textAlignVertical: 'top',
    },
    subjectPresetSection: {
      marginBottom: normalize(10),
    },
    subjectPresetTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      marginBottom: normalize(6),
    },
    subjectPresetRow: {
      gap: normalize(8),
      paddingRight: normalize(8),
    },
    subjectPresetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(6),
      borderRadius: normalize(14),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    subjectPresetDot: {
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(5),
    },
    subjectPresetText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    emptySubjectHint: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(16),
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: normalize(8),
      marginBottom: normalize(14),
    },
    colorLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(4),
    },
    colorScroll: {
      flexGrow: 0,
      marginLeft: normalize(8),
    },
    colorWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      paddingVertical: normalize(4),
    },
    colorDot: {
      width: normalize(22),
      height: normalize(22),
      borderRadius: normalize(11),
      borderWidth: 1,
      borderColor: colors.transparent,
    },
    colorDotSelected: {
      borderColor: colors.textPrimary,
      borderWidth: 2,
    },
    randomBtn: {
      marginLeft: normalize(10),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(6),
      borderRadius: normalize(12),
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(4),
    },
    randomIcon: {
      marginTop: 0,
    },
    randomText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      lineHeight: normalize(14),
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: normalize(10),
      gap: normalize(8),
    },
    cancelBtn: {
      flex: 1,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(10),
      borderRadius: normalize(10),
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    primaryBtn: {
      flex: 1,
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(10),
      borderRadius: normalize(10),
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    skelLineMb10: { marginBottom: normalize(10) },
    skelLineMb12: { marginBottom: normalize(12) },
    skelLineMb8: { marginBottom: normalize(8) },
    skelTitleMb14: { alignSelf: 'center', marginBottom: normalize(14) },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(16),
    },
    calendarMonthTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: normalize(6),
    },
    weekDayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: normalize(4),
    },
    weekDayText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.285%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(4),
    },
    dayInner: {
      width: normalize(28),
      height: normalize(28),
      borderRadius: normalize(14),
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayInnerSelected: {
      backgroundColor: colors.primary,
    },
    dayText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    timerSaveModalTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(10),
    },
    timerSaveModalBody: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
      marginBottom: normalize(16),
    },
    timerSaveModalConfirmBtn: {
      height: normalize(42),
      borderRadius: normalize(10),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerSaveModalConfirmText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    dayTextSelected: {
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
  });
