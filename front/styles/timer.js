import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

/** 모달 시트 상단 — colors.text 기준 (tokens.shadow 와 동일 톤) */
const friendModalSheetShadow = (normalize) =>
  Platform.select({
    ios: {
      shadowColor: colors.text,
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

/** 타이머 탭 레이아웃 확인용 윤곽선. 확인이 끝나면 false로 바꾼다 */
const DEBUG_TIMER_OUTLINE = __DEV__ && false;
const DEBUG_OUTLINE_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#30B0C7',
  '#0A84FF',
  '#5E5CE6',
  '#BF5AF2',
  '#FF2D55',
];

/** 타이머 카드 오른쪽 메뉴(timerMenu*)에만 윤곽선 — 테스트 끝나면 false */
const DEBUG_TIMER_MENU_OUTLINE = __DEV__ && false;

/** 타이머 시간 카드(TimerCard.jsx) 전체에만 윤곽선 — 테스트 끝나면 false */
export const DEBUG_TIMER_CARD_OUTLINE = __DEV__ && false;
const TIMER_CARD_KEY =
  /^(timerCard|timerMainCol|timerBlock|timerTime|timerBtn|dateBar|pomo|timerMenu)/;

const shouldOutlineKey = (key) =>
  DEBUG_TIMER_OUTLINE ||
  (DEBUG_TIMER_MENU_OUTLINE && key.startsWith('timerMenu')) ||
  (DEBUG_TIMER_CARD_OUTLINE && TIMER_CARD_KEY.test(key));

const withDebugOutline = (styleMap) => {
  if (
    !DEBUG_TIMER_OUTLINE &&
    !DEBUG_TIMER_MENU_OUTLINE &&
    !DEBUG_TIMER_CARD_OUTLINE
  ) {
    return styleMap;
  }
  const result = {};
  Object.keys(styleMap).forEach((key, i) => {
    const value = styleMap[key];
    result[key] =
      value && typeof value === 'object' && shouldOutlineKey(key)
        ? {
            ...value,
            borderWidth: 1,
            borderColor: DEBUG_OUTLINE_COLORS[i % DEBUG_OUTLINE_COLORS.length],
          }
        : value;
  });
  return result;
};

export const createTimerStyles = (width, normalize) => {
  return StyleSheet.create(
    withDebugOutline({
      container: {
        flex: 1,
        backgroundColor: colors.white,
      },
      scroll: {
        flex: 1,
        backgroundColor: colors.white,
      },
      scrollContent: {
        paddingHorizontal: width * 0.04,
        paddingTop: normalize(8),
        paddingBottom: normalize(24),
        gap: normalize(16),
      },
      dateBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: normalize(6),
      },
      dateBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
      },
      dateBarText: {
        fontSize: normalize(fontSizes.xxl),
        fontFamily: fonts.bold,
        color: colors.text,
        minWidth: normalize(100),
        textAlign: 'center',
      },
      /** 시간 영역 오른쪽 위 아이콘 버튼 (사진 저장·설정) */
      timerCardIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(10),
      },
      timerCardIconBtn: {
        padding: normalize(2),
      },
      dateBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(4),
      },
      // 친구 스토리 스타일
      friendStoryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
      },
      friendStoryScrollView: {
        flex: 1,
      },
      friendStoryScroll: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: normalize(16),
      },
      friendStoryAddCircleWrap: {
        alignItems: 'center',
        marginRight: normalize(13),
        width: normalize(50),
        flexShrink: 0,
      },
      friendStoryAddCircle: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(25),
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      },
      friendStoryAddLabel: {
        marginTop: normalize(4),
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
        textAlign: 'center',
      },
      friendStoryCircleWrap: {
        alignItems: 'center',
        marginRight: normalize(13),
        width: normalize(50),
        position: 'relative',
      },
      friendStoryCircle: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(25),
        justifyContent: 'center',
        alignItems: 'center',
      },
      friendSuggestDotOnCircle: {
        position: 'absolute',
        top: normalize(32),
        right: normalize(-1),
        width: normalize(20),
        height: normalize(20),
        borderRadius: normalize(10),
        borderWidth: 2,
        borderColor: colors.white,
      },
      friendStatusDotOnCircle: {
        position: 'absolute',
        top: normalize(38),
        right: normalize(-1),
        bottom: normalize(-3),
        width: normalize(12),
        height: normalize(12),
        borderRadius: normalize(10),
        borderWidth: 2,
        borderColor: colors.white,
      },
      friendStatusDotOnCircleMark: {
        top: normalize(38),
        right: normalize(1),
        width: normalize(12),
        height: normalize(12),
        borderRadius: normalize(6),
        borderWidth: 1.5,
      },
      friendStoryName: {
        marginTop: normalize(4),
        fontSize: normalize(fontSizes.lg),
        lineHeight: normalize(20),
        height: normalize(20),
        includeFontPadding: false,
        textAlignVertical: 'center',
        fontFamily: fonts.regular,
        color: colors.textLight4,
        textAlign: 'center',
        maxWidth: normalize(50),
      },

      // 타이머 상자 — 학교탭 급식 `mealSectionCard`와 동일 톤(배경·radius·shadow.md)
      timerCard: {
        backgroundColor: colors.white,
        borderRadius: normalize(16),
        paddingHorizontal: normalize(6),
        paddingVertical: normalize(6),
        marginBottom: normalize(10),
        borderWidth: 1,
        borderColor: colors.textLight1,
        flexDirection: 'row',
        alignItems: 'stretch',
      },
      /** 카드 왼쪽 시간 영역 (왼쪽:오른쪽 = 7:3) */
      timerMainCol: {
        flex: 7,
        minWidth: 0,
      },
      timerCardDivider: {
        width: 1,
        backgroundColor: colors.textLight1,
        marginHorizontal: normalize(6),
        marginVertical: normalize(6),
      },
      /** 카드 오른쪽 메뉴 영역 */
      timerMenuCol: {
        flex: 3,
        minWidth: 0,
        justifyContent: 'space-around',
      },
      timerMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(4),
      },
      timerMenuIconBox: {
        width: normalize(24),
        alignItems: 'center',
        justifyContent: 'center',
      },
      timerMenuTextCol: {
        flex: 1,
        minWidth: 0,
      },
      timerMenuLabel: {
        fontSize: normalize(fontSizes.md),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      timerMenuValue: {
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.bold,
        color: colors.text,
      },
      timerMenuValueDisabled: {
        color: colors.textLight3,
      },
      timerMenuProgressTrack: {
        height: normalize(4),
        borderRadius: normalize(2),
        backgroundColor: colors.textLight1,
        overflow: 'hidden',
      },
      timerMenuProgressFill: {
        height: '100%',
        borderRadius: normalize(2),
        backgroundColor: colors.primary,
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
        color: colors.textLight4,
        marginBottom: normalize(16),
      },
      timerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: normalize(8),
        paddingVertical: normalize(6),
        paddingHorizontal: normalize(20),
        borderRadius: normalize(24),
        backgroundColor: colors.primary,
      },
      timerBtnPause: {
        backgroundColor: colors.textLight1,
      },
      timerBtnText: {
        fontSize: normalize(fontSizes.xxl),
        fontFamily: fonts.bold,
        color: colors.white,
      },
      timerBtnTextPause: {
        color: colors.text,
      },
      /** 뽀모도로 ON — 시간 카드 안 */
      pomoPhaseRow: {
        alignSelf: 'stretch',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: normalize(4),
      },
      pomoPhaseChip: {
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(2),
        borderRadius: normalize(999),
        backgroundColor: colors.primaryLight3,
      },
      pomoPhaseChipText: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.bold,
        color: colors.primaryDark,
      },
      pomoPhaseChipBreak: {
        backgroundColor: '#FFF1EA',
      },
      pomoPhaseChipTextBreak: {
        color: '#C46A58',
      },
      timerTimeBreak: {
        color: '#E39A8C',
      },
      timerBtnBreak: {
        backgroundColor: '#E39A8C',
      },
      pomoProgressFillBreak: {
        backgroundColor: '#F0B5A6',
      },
      pomoCycleDotActiveBreak: {
        backgroundColor: '#E39A8C',
      },
      pomoCycleDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: normalize(4),
        marginTop: normalize(6),
      },
      pomoCycleDot: {
        width: normalize(6),
        height: normalize(6),
        borderRadius: normalize(3),
        backgroundColor: colors.textLight1,
      },
      pomoCycleDotActive: {
        backgroundColor: colors.primary,
      },
      pomoProgressTrack: {
        alignSelf: 'stretch',
        height: normalize(4),
        borderRadius: normalize(2),
        backgroundColor: colors.textLight1,
        overflow: 'hidden',
        marginBottom: normalize(10),
      },
      pomoProgressFill: {
        height: '100%',
        borderRadius: normalize(2),
        backgroundColor: colors.primary,
      },
      phaseEndBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: width * 0.08,
      },
      phaseEndCard: {
        alignSelf: 'stretch',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: normalize(24),
        paddingHorizontal: normalize(22),
        paddingTop: normalize(28),
        paddingBottom: normalize(22),
      },
      phaseEndBadge: {
        width: normalize(72),
        height: normalize(72),
        borderRadius: normalize(36),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: normalize(16),
      },
      phaseEndBadgeFocus: {
        backgroundColor: colors.primary,
      },
      phaseEndBadgeBreak: {
        backgroundColor: '#E39A8C',
      },
      phaseEndTitle: {
        fontSize: normalize(fontSizes.heading + 6),
        fontFamily: fonts.bold,
        color: colors.text,
        textAlign: 'center',
      },
      phaseEndBody: {
        marginTop: normalize(8),
        fontSize: normalize(fontSizes.xxl),
        fontFamily: fonts.regular,
        color: colors.textLight4,
        textAlign: 'center',
      },
      phaseEndBtn: {
        alignSelf: 'stretch',
        marginTop: normalize(22),
        paddingVertical: normalize(14),
        borderRadius: normalize(16),
        alignItems: 'center',
        backgroundColor: colors.primaryDark,
      },
      phaseEndBtnBreak: {
        backgroundColor: '#C46A58',
      },
      phaseEndBtnText: {
        fontSize: normalize(fontSizes.title),
        fontFamily: fonts.bold,
        color: colors.white,
      },
      pomoBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(12),
      },
      pomoSubBtn: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(16),
        borderWidth: 1,
        borderColor: colors.textLight1,
        alignItems: 'center',
        justifyContent: 'center',
      },
      pomoTodayText: {
        marginTop: normalize(8),
        fontSize: normalize(fontSizes.md),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },

      // 구분선
      divider: {
        height: 1,
        backgroundColor: colors.textLight1,
        marginBottom: normalize(10),
      },

      // 투두 + 타임테이블 수평 배치
      /** 플래너 메뉴 줄 (투두리스트 · 타임테이블 · 공부 잔디 · 위클리) */
      plannerTabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.textLight1,
      },
      plannerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: normalize(2),
      },
      plannerTabText: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.bold,
        color: colors.textLight3,
      },
      plannerTabTextActive: {
        color: colors.text,
      },
      plannerTabIndicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        backgroundColor: colors.text,
      },
      /** 위클리 — 일~토 세로 체크리스트 */
      weeklyWrap: {
        flex: 1,
      },
      weeklyDayRow: {
        flexDirection: 'row',
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(8),
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: colors.textLight1,
        borderRadius: normalize(12),
        backgroundColor: colors.white,
      },
      weeklyDayRowToday: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight1,
      },
      weeklyDayLabelCol: {
        width: normalize(36),
        alignItems: 'center',
      },
      weeklyDayLabel: {
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.bold,
        color: colors.text,
      },
      weeklyDayDate: {
        fontSize: normalize(fontSizes.md),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      weeklyDayBody: {
        flex: 1,
        minWidth: 0,
        marginLeft: normalize(8),
      },
      weeklyItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
        paddingVertical: normalize(4),
      },
      weeklyItemText: {
        flex: 1,
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.regular,
        color: colors.text,
      },
      weeklyInput: {
        flex: 1,
        paddingVertical: 0,
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.regular,
        color: colors.text,
      },
      weeklyAddBtn: {
        alignSelf: 'flex-start',
        paddingVertical: normalize(4),
      },
      weeklyAddBtnText: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      /** 공부 잔디 달력 */
      grassWrap: {
        alignSelf: 'stretch',
      },
      grassHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: normalize(12),
      },
      grassNavBtn: {
        width: normalize(36),
        height: normalize(36),
        alignItems: 'center',
        justifyContent: 'center',
      },
      grassMonthBtn: {
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        alignItems: 'center',
        justifyContent: 'center',
      },
      grassMonthLabel: {
        textAlign: 'center',
        fontSize: normalize(fontSizes.xxl),
        fontFamily: fonts.bold,
        color: colors.text,
      },
      /** 공부 잔디 — 연·월 휠 시트 (회원가입 생년월일 picker 시트와 같은 모양) */
      ymOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.3)',
      },
      ymOverlayTouch: {
        flex: 1,
      },
      ymSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: normalize(20),
        borderTopRightRadius: normalize(20),
        paddingBottom: normalize(24),
      },
      ymToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.textLight1,
      },
      ymToolbarTitle: {
        fontFamily: fonts.bold,
        fontSize: normalize(fontSizes.xl),
        color: colors.text,
      },
      ymToolbarBtn: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.xl),
        color: colors.textLight4,
        minWidth: normalize(44),
      },
      ymToolbarOk: {
        color: colors.primaryDark,
        textAlign: 'right',
        fontFamily: fonts.bold,
      },
      datePickerWheelWrap: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      },
      weekCalBody: {
        paddingHorizontal: normalize(12),
        paddingTop: normalize(8),
      },
      weekCalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(8),
        paddingBottom: normalize(10),
      },
      weekCalGrid: {
        height: (normalize(40) + normalize(4)) * 6,
      },
      weekCalMonth: {
        fontFamily: fonts.bold,
        fontSize: normalize(fontSizes.xl),
        color: colors.text,
      },
      weekCalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: normalize(10),
        marginVertical: normalize(2),
      },
      weekCalRowSelected: {
        backgroundColor: colors.primaryLight4,
      },
      weekCalDay: {
        flex: 1,
        height: normalize(40),
        alignItems: 'center',
        justifyContent: 'center',
      },
      weekCalDayText: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.lg),
        color: colors.text,
      },
      weekCalDayTextOutside: {
        color: colors.textLight3,
      },
      weekCalDayTextToday: {
        fontFamily: fonts.bold,
        color: colors.primaryDark,
      },
      weekCalDayTextSelected: {
        fontFamily: fonts.bold,
      },
      weekCalSunday: {
        color: '#E23B3B',
      },
      weekCalSaturday: {
        color: '#3A7BD5',
      },
      weekCalSundayMuted: {
        color: '#F0A8A8',
      },
      weekCalSaturdayMuted: {
        color: '#A9C6F2',
      },
      ymWheelWrap: {
        flexDirection: 'row',
        marginVertical: normalize(8),
        paddingHorizontal: normalize(16),
      },
      ymWheelHighlight: {
        position: 'absolute',
        left: normalize(16),
        right: normalize(16),
        borderRadius: normalize(10),
        backgroundColor: colors.textLight05,
      },
      ymWheelColumn: {
        flex: 1,
      },
      ymWheelItem: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      ymWheelText: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.xxl),
        color: colors.textLight4,
      },
      ymWheelTextSelected: {
        fontFamily: fonts.bold,
        color: colors.text,
      },
      ymWheelTextDisabled: {
        color: colors.textLight2,
      },
      grassWeekdayRow: {
        flexDirection: 'row',
        marginBottom: normalize(6),
      },
      grassWeekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      grassWeekRow: {
        flexDirection: 'row',
      },
      grassDayCell: {
        flex: 1,
        height: normalize(48),
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: normalize(4),
      },
      grassTodayBadge: {
        minWidth: normalize(20),
        height: normalize(20),
        paddingHorizontal: normalize(3),
        borderRadius: normalize(10),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.primaryDark,
      },
      grassTodayText: {
        fontFamily: fonts.bold,
        color: colors.primaryDark,
      },
      grassDayText: {
        fontSize: normalize(fontSizes.md),
        fontFamily: fonts.regular,
        color: colors.text,
      },
      grassDayTextOutside: {
        color: colors.textLight3,
      },
      grassFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: normalize(12),
      },
      grassMonthTotal: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.bold,
        color: colors.text,
      },
      grassLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(3),
      },
      grassLegendChip: {
        minWidth: normalize(22),
        paddingHorizontal: normalize(4),
        paddingVertical: normalize(2),
        borderRadius: normalize(3),
        alignItems: 'center',
      },
      grassLegendText: {
        fontSize: normalize(fontSizes.md),
        fontFamily: fonts.bold,
        color: colors.text,
      },
      grassDurationText: {
        marginTop: normalize(2),
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.text,
      },
      /** 공부 잔디 — 지난 날짜 기록 시트 */
      dayRecordBackdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.5)',
      },
      dayRecordBackdropTouch: {
        flex: 1,
      },
      dayRecordSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: normalize(24),
        borderTopRightRadius: normalize(24),
        paddingHorizontal: width * 0.04,
        paddingTop: normalize(18),
      },
      dayRecordHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: normalize(8),
      },
      dayRecordTitle: {
        flex: 1,
        minWidth: 0,
        marginRight: normalize(10),
        fontSize: normalize(fontSizes.xxl),
        fontFamily: fonts.bold,
        color: colors.text,
      },
      dayRecordHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
      },
      dayRecordSaveBtn: {
        padding: normalize(4),
      },
      dayRecordCloseBtn: {
        padding: normalize(2),
      },
      dayRecordSaveBtnDisabled: {
        opacity: 0.4,
      },
      dayRecordScroll: {
        flex: 1,
      },
      /** 탭바 아래 내용 — 타이머 탭 todoTimetableRow.marginTop과 같은 값 */
      dayRecordBody: {
        marginTop: normalize(8),
      },
      dayRecordSkeleton: {
        paddingTop: normalize(48),
        gap: normalize(14),
      },
      dayRecordEmptyText: {
        marginTop: normalize(24),
        textAlign: 'center',
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      todoTimetableRow: {
        flex: 1,
        minHeight: normalize(320),
        marginTop: normalize(8),
      },
      todoColumn: {
        flex: 1,
        alignSelf: 'stretch',
      },
      todoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: normalize(10),
      },
      todoHeaderButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: normalize(8),
      },
      todoAddBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
        width: '100%',
        paddingVertical: normalize(4),
        borderRadius: normalize(20),
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.textLight3,
        backgroundColor: colors.white,
        gap: normalize(4),
      },
      todoAddBtnText: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
        textAlign: 'center',
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
        borderRadius: normalize(14),
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.textLight1,
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
        color: colors.text,
      },
      subjectTime: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
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
        color: colors.white,
      },
      subjectTasksArea: {
        backgroundColor: colors.white,
        paddingVertical: normalize(6),
        borderTopWidth: 0.5,
        borderTopColor: colors.textLight1,
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
        borderColor: colors.textLight2,
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
        color: colors.text,
      },
      taskContentDone: {
        color: colors.textLight4,
        textDecorationLine: 'line-through',
      },
      todoAddUnderSubject: {
        paddingVertical: normalize(6),
        paddingLeft: normalize(18),
      },
      todoAddUnderSubjectText: {
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      taskStatusRow: {
        flexDirection: 'row',
        gap: normalize(4),
      },
      taskStatusBtn: {
        width: normalize(26),
        height: normalize(26),
        borderRadius: normalize(13),
        backgroundColor: colors.textLight1,
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
        backgroundColor: colors.textLight4,
      },
      taskStatusText: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.bold,
        color: colors.white,
      },
      timetableColumn: {
        flex: 1,
        alignSelf: 'stretch',
      },
      timetableSchoolHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(4),
        marginBottom: normalize(8),
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(6),
        borderRadius: normalize(10),
        backgroundColor: '#F6F4F0',
      },
      timetableSchoolHintText: {
        flex: 1,
        fontSize: normalize(fontSizes.md),
        fontFamily: fonts.regular,
        color: colors.textLight5,
        lineHeight: normalize(14),
      },
      timetableContainer: {
        borderWidth: 1,
        borderColor: colors.textLight1,
        borderRadius: normalize(12),
        overflow: 'hidden',
        backgroundColor: colors.white,
        paddingVertical: normalize(4),
      },
      timetableContainerCapture: {
        borderWidth: 0,
        borderRadius: 0,
        paddingVertical: 0,
      },
      timetableScroll: {
        // 높이 제한을 없애 전체 페이지 스크롤에서 00~05까지 노출
      },
      stopwatchCard: {
        backgroundColor: colors.white,
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
        color: colors.text,
      },
      stopwatchSubLabel: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
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
        backgroundColor: colors.textLight1,
      },
      controlButtonText: {
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.bold,
        color: colors.white,
      },
      controlButtonTextSecondary: {
        color: colors.text,
      },

      // 친구 섹션
      friendSection: {
        backgroundColor: colors.white,
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
        color: colors.text,
      },
      friendAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(4),
        paddingVertical: normalize(4),
        paddingHorizontal: normalize(8),
        borderRadius: normalize(12),
        backgroundColor: colors.primaryLight4,
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
      friendSuggestBadge: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      },
      friendName: {
        marginTop: normalize(4),
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
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
        backgroundColor: colors.textLight1,
        borderRadius: normalize(12),
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(6),
        gap: normalize(6),
      },
      friendSearchInput: {
        flex: 1,
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.regular,
        color: colors.text,
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
        color: colors.white,
      },

      // 타임테이블
      timetableSection: {
        backgroundColor: colors.white,
        borderRadius: normalize(20),
        paddingVertical: normalize(14),
        paddingHorizontal: normalize(20),
        ...shadow.sm,
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
        color: colors.textLight4,
      },
      timetableBody: {
        maxHeight: normalize(600),
      },
      timetableRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderTopWidth: 0.5,
        borderColor: colors.textLight1,
      },
      timetableRowSchoolJoin: {
        borderTopWidth: 0,
      },
      timetableRowFirst: {
        borderTopWidth: 0,
      },
      timetableHourCell: {
        width: normalize(32),
        height: normalize(20),
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
      },
      timetableHourCellGrid: {
        borderTopWidth: 0.5,
        borderColor: colors.textLight1,
      },
      timetableHourText: {
        fontSize: normalize(fontSizes.lg),
        lineHeight: normalize(20),
        includeFontPadding: false,
        textAlignVertical: 'center',
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },
      timetableSlotsRow: {
        flexDirection: 'row',
        flex: 1,
        minWidth: 0,
        position: 'relative',
      },
      timetableSlotPaint: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      timetableSlotCell: {
        flex: 1,
        alignSelf: 'stretch',
        flexDirection: 'row',
        overflow: 'hidden',
        minWidth: 0,
        borderLeftWidth: 0.5,
        borderColor: colors.textLight1,
        backgroundColor: 'transparent',
        paddingVertical: normalize(4),
      },
      timetableSlotSegment: {
        alignSelf: 'stretch',
        minWidth: 0,
      },
      timetableSchoolBadge: {
        position: 'absolute',
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
      },
      timetableSchoolBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(4),
        paddingHorizontal: normalize(8),
        borderRadius: normalize(8),
        backgroundColor: '#E4E0D8',
      },
      timetableSchoolBadgeText: {
        fontSize: normalize(fontSizes.lg),
        lineHeight: normalize(16),
        includeFontPadding: false,
        fontFamily: fonts.bold,
        color: colors.textLight5,
      },
      timetableSlotProgress: {
        flex: 0,
        minWidth: 0,
      },
      timetableSlotSegment: {
        minWidth: 0,
      },
      timetableSlotActive: {
        backgroundColor: colors.primaryLight4,
      },
      timetableFooterText: {
        marginTop: normalize(8),
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
      },

      // 저장용 플래너 캡처 (좌: 날짜/시간/투두, 우: 타임테이블, 버튼 없음)
      plannerCaptureWrap: {
        position: 'relative',
        width: width,
        backgroundColor: colors.white,
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
        borderColor: colors.textLight1,
      },
      plannerRightColumn: {
        flex: 1,
      },
      plannerLabel: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
        marginBottom: normalize(2),
      },
      plannerValue: {
        fontSize: normalize(fontSizes.xxl),
        fontFamily: fonts.bold,
        color: colors.text,
        marginBottom: normalize(8),
      },
      plannerMemoLine: {
        height: 1,
        backgroundColor: colors.textLight1,
        marginBottom: normalize(16),
      },
      plannerTodoTitle: {
        fontSize: normalize(fontSizes.xl),
        fontFamily: fonts.bold,
        color: colors.text,
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
        color: colors.text,
      },
      plannerSubjectTime: {
        fontSize: normalize(fontSizes.lg),
        fontFamily: fonts.regular,
        color: colors.textLight4,
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
        borderColor: colors.textLight2,
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
        color: colors.text,
      },
      plannerTaskContentDone: {
        color: colors.textLight4,
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
        pointerEvents: 'none',
      },
      viewShotBg: {
        backgroundColor: colors.white,
      },
      captureWatermarkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 10,
      },
      captureWatermarkImage: {
        width: normalize(180),
        height: normalize(180),
        opacity: 0.2,
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
      timerSkelTtTitle: {
        marginBottom: normalize(10),
      },
      timerSkelSubjectBlock: {
        marginBottom: normalize(8),
      },
      safeAreaFlex: {
        flex: 1,
      },
    }),
  );
};

/** timerFriendModals.jsx — PokeModal / AddFriendModal 전용 */
export const createTimerFriendModalStyles = (normalize) =>
  StyleSheet.create({
    pokeOverlay: {
      flex: 1,
      backgroundColor: colors.transparent,
    },
    pokeWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    pokeCard: {
      paddingHorizontal: normalize(18),
      paddingTop: normalize(18),
      paddingBottom: normalize(14),
    },
    pokePopup: {
      backgroundColor: colors.white,
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      paddingHorizontal: normalize(24),
      paddingBottom: normalize(40),
      paddingTop: normalize(12),
      ...friendModalSheetShadow(normalize),
    },
    pokeHint: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      textAlign: 'center',
      lineHeight: normalize(20),
      includeFontPadding: false,
      marginBottom: normalize(14),
    },
    pokeHintHighlight: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    pokeHandle: {
      width: normalize(40),
      height: normalize(4),
      backgroundColor: colors.textLight1,
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
      color: colors.text,
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
      color: colors.textLight4,
      lineHeight: normalize(20),
      includeFontPadding: false,
    },
    pokeStatusText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      color: colors.text,
      lineHeight: normalize(24),
      includeFontPadding: false,
      textAlign: 'center',
    },
    pokeOutsideDescHighlight: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    pokeOutsideDescRest: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    pokeDivider: {
      height: 1,
      backgroundColor: colors.textLight1,
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
      color: colors.textLight2,
      lineHeight: normalize(16),
    },
    pokePrimaryBtn: {
      backgroundColor: colors.primaryLight3,
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
    pokeActionRow: {
      flexDirection: 'row',
      gap: normalize(10),
    },
    pokeActionCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      paddingVertical: normalize(16),
      borderRadius: normalize(16),
      backgroundColor: colors.primaryLight3,
    },
    pokeActionIcon: {
      width: normalize(40),
      height: normalize(40),
      borderRadius: normalize(20),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
    },
    pokeActionCardText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
      textAlign: 'center',
    },
    pokeMessageCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      paddingVertical: normalize(16),
      borderRadius: normalize(16),
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.textLight1,
    },
    pokeMessageIcon: {
      width: normalize(40),
      height: normalize(40),
      borderRadius: normalize(20),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.textLight0,
    },
    pokeMessageCardText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.text,
      textAlign: 'center',
    },
    // 쿡 찌르기 전용 버튼
    pokeActionBtn: {
      backgroundColor: colors.primaryLight3,
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
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(20),
      paddingVertical: normalize(12),
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    // 메시지 보내기 전용 버튼
    pokeMessageActionBtn: {
      backgroundColor: colors.textLight1,
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
      color: colors.textLight2,
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
      color: colors.textLight2,
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
      color: colors.white,
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      alignSelf: 'flex-start',
      textAlign: 'left',
      paddingHorizontal: normalize(14),
    },
    pokeCancelBtn: {
      paddingVertical: normalize(12),
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(20),
    },
    pokeCancelBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
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
      backgroundColor: colors.white,
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
      backgroundColor: colors.textLight1,
      borderRadius: normalize(2),
      alignSelf: 'center',
      marginBottom: normalize(20),
    },
    addFriendTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(10),
      marginTop: normalize(10),
    },
    addFriendSubtitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    addFriendInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight05,
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
      color: colors.text,
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
      color: colors.white,
    },
    addFriendCancelBtn: {
      paddingVertical: normalize(12),
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(14),
    },
    addFriendCancelBtnText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
  });

/** timerModals.jsx — AddSubjectModal / AddTaskModal / CalendarModal */
export const createTimerModalsStyles = (normalize) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
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
      backgroundColor: colors.white,
      borderRadius: normalize(18),
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(18),
    },
    bottomSheetCard: {
      backgroundColor: colors.white,
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
      color: colors.text,
      marginBottom: normalize(10),
    },
    label: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight4,
      marginBottom: normalize(6),
    },
    labelNoMargin: {
      marginBottom: 0,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.textLight1,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(10),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      marginBottom: normalize(12),
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    inputMultiline: {
      minHeight: normalize(60),
      textAlignVertical: 'center',
    },
    subjectPresetSection: {
      marginBottom: normalize(10),
    },
    subjectPresetTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight4,
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
      backgroundColor: colors.textLight05,
    },
    subjectPresetDot: {
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(5),
    },
    subjectPresetText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    emptySubjectHint: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      marginBottom: normalize(16),
    },
    colorSection: {
      marginTop: normalize(8),
      marginBottom: normalize(14),
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(4),
    },
    colorScroll: {
      flexGrow: 0,
      flexShrink: 1,
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
      borderColor: colors.text,
      borderWidth: 2,
    },
    randomBtn: {
      marginLeft: normalize(10),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(6),
      borderRadius: normalize(12),
      backgroundColor: colors.textLight05,
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
      color: colors.textLight4,
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
      backgroundColor: colors.textLight05,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight4,
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
      color: colors.white,
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
      color: colors.text,
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
      color: colors.textLight4,
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
      color: colors.text,
    },
    timerSaveModalTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: normalize(10),
    },
    timerSaveModalBody: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      color: colors.white,
    },
    dayTextSelected: {
      fontFamily: fonts.bold,
      color: colors.white,
    },
  });

/** 타이머 설정 화면 — 뽀모도로 · 스터디룸 캐릭터 */
export const createTimerSettingsStyles = (width, normalize) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.white,
    },
    scrollContent: {
      paddingHorizontal: width * 0.04,
      paddingTop: normalize(8),
      paddingBottom: normalize(32),
    },
    sectionTitle: {
      marginTop: normalize(16),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.textLight1,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(14),
      marginTop: normalize(8),
      backgroundColor: colors.white,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: normalize(14),
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.textLight05,
    },
    rowTextCol: {
      flex: 1,
      minWidth: 0,
      marginRight: normalize(12),
    },
    rowLabel: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    rowLabelDisabled: {
      color: colors.textLight3,
    },
    rowDesc: {
      marginTop: normalize(2),
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(10),
    },
    stepperBtn: {
      width: normalize(28),
      height: normalize(28),
      borderRadius: normalize(14),
      borderWidth: 1,
      borderColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      minWidth: normalize(44),
      textAlign: 'center',
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    stepperValueDisabled: {
      color: colors.textLight3,
    },
    genderRow: {
      flexDirection: 'row',
      gap: normalize(8),
      paddingVertical: normalize(14),
    },
    genderOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: normalize(12),
      borderWidth: 1,
      borderColor: colors.textLight1,
      borderRadius: normalize(12),
      backgroundColor: colors.white,
    },
    genderOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight1,
    },
    genderImage: {
      width: normalize(48),
      height: normalize(48),
      marginBottom: normalize(6),
    },
    genderRandomBox: {
      width: normalize(48),
      height: normalize(48),
      marginBottom: normalize(6),
      alignItems: 'center',
      justifyContent: 'center',
    },
    genderLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    genderLabelActive: {
      fontFamily: fonts.bold,
      color: colors.text,
    },
    cueBlock: {
      paddingTop: normalize(14),
      paddingBottom: normalize(12),
    },
    cueRow: {
      flexDirection: 'row',
      gap: normalize(6),
      marginTop: normalize(10),
    },
    cueChip: {
      flex: 1,
      height: normalize(32),
      borderRadius: normalize(10),
      borderWidth: 1,
      borderColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
    },
    cueChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight1,
    },
    cueChipText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    cueChipTextActive: {
      fontFamily: fonts.bold,
      color: colors.text,
    },
    footNote: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
  });
