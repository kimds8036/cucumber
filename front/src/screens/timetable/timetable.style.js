import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const normalize = (size) => size;
const COLORS = {
  ...colors,
  inputBackground: colors.surface,
  selectedBackground: colors.primaryLight20,
  textDisabled: colors.textLight20,
  textTertiary: colors.textSecondary,
  white: colors.background,
};

export const DAYS = ['월', '화', '수', '목', '금'];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7];
export const CELL_HEIGHT = 34;
export const CELL_GAP = 1;
export const PERIOD_COL_WIDTH = 22;

const tableHeight =
  PERIODS.length * CELL_HEIGHT + (PERIODS.length - 1) * CELL_GAP;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: normalize(16),
    paddingTop: normalize(12),
  },
  schoolInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(12),
  },
  schoolInfoText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: COLORS.textSecondary,
    marginRight: normalize(8),
  },
  neisBadge: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(2),
  },
  neisBadgeText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: COLORS.primary,
  },
  searchInput: {
    height: normalize(42),
    borderRadius: 10,
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: normalize(12),
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: COLORS.textPrimary,
    marginBottom: normalize(14),
  },
  tableWrap: {
    marginBottom: normalize(16),
  },
  tableHeaderRow: {
    flexDirection: 'row',
    marginBottom: CELL_GAP,
  },
  periodHeaderCell: {
    width: PERIOD_COL_WIDTH,
    height: normalize(26),
  },
  dayHeaderCell: {
    flex: 1,
    height: normalize(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: COLORS.textSecondary,
  },
  tableBodyRow: {
    flexDirection: 'row',
    height: tableHeight,
  },
  periodCol: {
    width: PERIOD_COL_WIDTH,
    marginRight: CELL_GAP,
  },
  periodCell: {
    height: CELL_HEIGHT,
    marginBottom: CELL_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontFamily: fonts.regular,
    fontSize: normalize(9),
    color: COLORS.textSecondary,
  },
  dayCol: {
    flex: 1,
    marginRight: CELL_GAP,
    position: 'relative',
  },
  dayColLast: {
    marginRight: 0,
  },
  emptyCell: {
    height: CELL_HEIGHT,
    marginBottom: CELL_GAP,
    backgroundColor: COLORS.surface,
  },
  blockCell: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: normalize(6),
    paddingHorizontal: normalize(4),
    paddingVertical: normalize(4),
    justifyContent: 'center',
  },
  blockTitle: {
    fontFamily: fonts.bold,
    fontSize: normalize(8),
    color: COLORS.white,
  },
  blockRoom: {
    fontFamily: fonts.regular,
    fontSize: normalize(7),
    color: COLORS.textLight70,
    marginTop: normalize(1),
  },
  subjectList: {
    maxHeight: normalize(320),
  },
  subjectRow: {
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(10),
    marginBottom: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectRowSelected: {
    backgroundColor: COLORS.selectedBackground,
  },
  colorDot: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(10),
    marginRight: normalize(10),
  },
  subjectBody: {
    flex: 1,
  },
  subjectTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: COLORS.textPrimary,
  },
  subjectTitleDisabled: {
    color: COLORS.textDisabled,
  },
  subjectMeta: {
    marginTop: normalize(2),
    fontFamily: fonts.regular,
    fontSize: normalize(11),
    color: COLORS.textSecondary,
  },
  checkCircle: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(20),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleInner: {
    width: normalize(9),
    height: normalize(9),
    borderRadius: normalize(9),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: normalize(18),
    borderTopRightRadius: normalize(18),
    paddingHorizontal: normalize(16),
    paddingTop: normalize(10),
    paddingBottom: normalize(16),
    maxHeight: '78%',
  },
  handleBar: {
    width: normalize(48),
    height: normalize(4),
    backgroundColor: COLORS.border,
    borderRadius: normalize(10),
    alignSelf: 'center',
    marginBottom: normalize(10),
  },
  bsTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.title,
    color: COLORS.textPrimary,
  },
  bsSub: {
    marginTop: normalize(4),
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: COLORS.textSecondary,
    marginBottom: normalize(10),
  },
  bsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: normalize(10),
  },
  bsRoomLabel: {
    fontFamily: fonts.bold,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
    marginBottom: normalize(6),
  },
  classOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: normalize(10),
    padding: normalize(10),
    marginBottom: normalize(8),
    flexDirection: 'row',
  },
  radioOuter: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(18),
    borderWidth: 1.5,
    marginRight: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(2),
  },
  radioDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(8),
  },
  classInfoWrap: {
    flex: 1,
  },
  classMain: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: COLORS.textPrimary,
  },
  classSchedule: {
    marginTop: normalize(2),
    fontFamily: fonts.regular,
    fontSize: normalize(11),
    color: COLORS.textSecondary,
  },
  badgeRow: {
    marginTop: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: normalize(4),
  },
  daySeparator: {
    fontFamily: fonts.regular,
    fontSize: normalize(10),
    color: COLORS.textTertiary,
    marginRight: normalize(2),
  },
  periodBadge: {
    borderRadius: normalize(10),
    paddingHorizontal: normalize(6),
    paddingVertical: normalize(3),
  },
  periodBadgeText: {
    fontFamily: fonts.bold,
    fontSize: normalize(9),
  },
  completeButton: {
    marginTop: normalize(8),
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: COLORS.white,
  },
  choiceScroll: {
    flex: 1,
  },
  choiceContent: {
    flexGrow: 1,
    paddingHorizontal: normalize(16),
    paddingTop: normalize(70),
    paddingBottom: normalize(24),
    gap: normalize(12),
  },
  choiceCardRight: {
    alignSelf: 'center',
    width: '100%',
    borderRadius: normalize(14),
    backgroundColor: COLORS.primary,
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(12),
    marginTop: normalize(10),
  },
  choiceCardWrong: {
    alignSelf: 'center',
    width: '100%',
    borderRadius: normalize(14),
    backgroundColor: COLORS.textLight5,
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(12),
    marginTop: normalize(10),
  },
  choiceTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.heading + 2,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  choiceRightTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.title,
    color: COLORS.background,
    textAlign: 'center',
  },
  choiceWrongTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.title,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  choiceDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  choiceLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.textLight70,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  choiceLoadingText: {
    marginTop: normalize(12),
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: normalize(24),
  },
  choiceCardDisabled: {
    opacity: 0.55,
  },
});

/**
 * 마이페이지 `TimetableView` 등 — `getNormalize(width)`로 만든 normalize 전달
 * @param {{ dividerColor?: string }} [options] — 격자·외곽 구분선 색 (기본 `textLight10`)
 */
export function createTimetableViewStyles(normalize, options = {}) {
  const dividerColor = options.dividerColor ?? COLORS.textLight10;
  return StyleSheet.create({
    wrapper: {
      marginTop: normalize(16),
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: normalize(20),
    },
    footerResetLabel: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.textLight70,
    },
    timetableContainer: {
      borderRadius: normalize(8),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: dividerColor,
    },
    /** 이미지 저장용: 요일~교시 격자만 (푸터 제외) */
    timetableViewShot: {
      backgroundColor: COLORS.background,
    },
    daysRow: {
      flexDirection: 'row',
      backgroundColor: COLORS.textLight5,
    },
    periodHeaderCell: {
      width: normalize(20),
      height: normalize(20),
      backgroundColor: COLORS.textLight5,
    },
    dayCell: {
      flex: 1,
      height: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: dividerColor,
    },
    dayText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    row: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: dividerColor,
    },
    lunchRow: {
      borderTopWidth: 1,
      borderTopColor: dividerColor,
      backgroundColor: COLORS.textLight5,
      paddingVertical: normalize(2),
      alignItems: 'center',
      justifyContent: 'center',
    },
    lunchText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
      color: COLORS.textSecondary,
    },
    periodCell: {
      width: normalize(20),
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.textLight5,
    },
    periodText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    mergedFooterRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: dividerColor,
    },
    mergedFooterFullCell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: normalize(35),
      backgroundColor: COLORS.background,
    },
    mergedFooterActionRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: normalize(8),
      paddingHorizontal: normalize(8),
    },
    classCell: {
      flex: 1,
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: dividerColor,
      backgroundColor: COLORS.background,
      padding: normalize(2),
    },
    classCellFilled: {
      backgroundColor: COLORS.primaryLight30,
    },
    classCellText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textLight20,
      textAlign: 'center',
    },
    classCellTextFilled: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.md,
      color: COLORS.textPrimary,
    },
    saveSuccessModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(24),
    },
    saveSuccessModalCard: {
      width: '85%',
      maxWidth: normalize(340),
      backgroundColor: COLORS.background,
      borderRadius: normalize(20),
      padding: normalize(24),
      alignItems: 'center',
    },
    saveSuccessModalTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.title,
      color: COLORS.textPrimary,
      marginBottom: normalize(10),
      textAlign: 'center',
    },
    saveSuccessModalBody: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.lg,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: normalize(20),
    },
    saveSuccessModalConfirm: {
      width: '100%',
      height: normalize(45),
      backgroundColor: COLORS.primary,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveSuccessModalConfirmText: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.xxl,
      color: COLORS.background,
    },
    /** 마이페이지 시간표 초기화 확인 (저장 완료 모달과 동일 셸 + 이중 버튼) */
    timetableResetModalActions: {
      flexDirection: 'row',
      width: '100%',
      gap: normalize(10),
    },
    timetableResetModalCancel: {
      flex: 1,
      height: normalize(40),
      backgroundColor: COLORS.surface,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    timetableResetModalCancelText: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.textSecondary,
    },
    timetableResetModalDelete: {
      flex: 1,
      height: normalize(40),
      backgroundColor: COLORS.alert,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    timetableResetModalDeleteText: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.textWhite,
    },
  });
}

/** 시간표 선택 화면 미리보기 — `TimetableView`와 동일 규격, 스타일 키만 분리 */
export function createTimetableChoicePreviewStyles(normalize) {
  return StyleSheet.create({
    choicePreviewWrapper: {},
    choicePreviewRefreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: normalize(20),
    },
    choicePreviewTimetableContainer: {
      borderRadius: normalize(8),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.timetableBorder,
    },
    choicePreviewEmptyContainer: {
      minHeight: normalize(200),
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: normalize(32),
      paddingHorizontal: normalize(20),
      backgroundColor: COLORS.background,
    },
    choicePreviewEmptyText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.lg,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
    },
    choicePreviewNoticeBanner: {
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
      backgroundColor: COLORS.background,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.timetableBorder,
    },
    choicePreviewNoticeText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(20),
    },
    choicePreviewGrid: {
      backgroundColor: COLORS.background,
    },
    choicePreviewDaysRow: {
      flexDirection: 'row',
      backgroundColor: COLORS.textLight5,
    },
    choicePreviewPeriodHeaderCell: {
      width: normalize(20),
      height: normalize(20),
      backgroundColor: COLORS.textLight5,
    },
    choicePreviewDayCell: {
      flex: 1,
      height: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: COLORS.timetableBorder,
    },
    choicePreviewDayText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    choicePreviewRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.timetableBorder,
    },
    choicePreviewPeriodCell: {
      width: normalize(20),
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.textLight5,
    },
    choicePreviewPeriodText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    choicePreviewMergedFooterRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.timetableBorder,
    },
    choicePreviewMergedFooterFullCell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: normalize(35),
      backgroundColor: COLORS.background,
    },
    choicePreviewMergedFooterActionRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: normalize(8),
      paddingHorizontal: normalize(8),
    },
    choicePreviewClassCell: {
      flex: 1,
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: COLORS.timetableBorder,
      backgroundColor: COLORS.background,
      padding: normalize(2),
    },
    choicePreviewClassCellFilled: {
      backgroundColor: COLORS.primaryLight30,
    },
    choicePreviewClassCellText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textLight20,
      textAlign: 'center',
    },
    choicePreviewClassCellTextFilled: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.md,
      color: COLORS.textPrimary,
    },
  });
}

/** 직접 선택(TimetableScreen) — 교시 스크롤 영역에 보이는 행 수 */
export const MANUAL_TS_VISIBLE_PERIOD_ROWS = 6;

/** 직접 선택(TimetableScreen) — 미리보기와 동일 레이아웃 규격, 스타일 키만 분리 */
export function createManualTimetableScreenStyles(normalize) {
  /** 요일 헤더 행(교시 코너·요일 칸 공통 높이 `normalize(20)`) */
  const manualTsDaysHeaderHeight = normalize(20);
  /** 한 교시 행 높이(교시 셀 `normalize(40)`) + 행 구분 `borderTop` 1px 근사 */
  const manualTsPeriodRowStride = normalize(40) + 1;

  return StyleSheet.create({
    manualTsHint: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.lg,
      color: COLORS.textSecondary,
      marginBottom: normalize(10),
      lineHeight: normalize(15),
      textAlign: 'center',
    },
    /** 페이지 전체 스크롤 없음 — 상단 고정 + 하단 과목 영역만 스크롤 */
    manualTsPageBody: {
      flex: 1,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(12),
    },
    manualTsSubjectSectionScroll: {
      flex: 1,
    },
    manualTsSubjectSectionScrollContent: {
      paddingBottom: normalize(24),
    },
    manualTsWrapper: {
      width: '100%',
    },
    manualTsTimetableContainer: {
      borderRadius: normalize(8),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.timetableBorder,
      marginBottom: normalize(14),
    },
    manualTsGrid: {
      backgroundColor: COLORS.background,
    },
    /** 이미지 저장: 격자(스크롤)만 캡처, 푸터 제외 */
    manualTsTimetableViewShot: {
      backgroundColor: COLORS.background,
    },
    manualTsRefreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: normalize(20),
    },
    manualTsFooterIconLabel: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.textLight70,
    },
    manualTsMergedFooterRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.timetableBorder,
    },
    manualTsMergedFooterFullCell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: normalize(30),
      backgroundColor: COLORS.background,
    },
    manualTsMergedFooterActionRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      paddingHorizontal: normalize(8),
    },
    /** 스크롤 뷰포트: 요일 헤더 + 교시 `MANUAL_TS_VISIBLE_PERIOD_ROWS`행까지 한 화면에 */
    manualTsPeriodScroll: {
      maxHeight:
        manualTsDaysHeaderHeight +
        manualTsPeriodRowStride * MANUAL_TS_VISIBLE_PERIOD_ROWS,
    },
    manualTsPeriodScrollContent: {
      flexGrow: 0,
    },
    manualTsDaysRow: {
      flexDirection: 'row',
      backgroundColor: COLORS.textLight5,
    },
    manualTsPeriodHeaderCell: {
      width: normalize(20),
      height: normalize(20),
      backgroundColor: COLORS.textLight5,
    },
    manualTsDayCell: {
      flex: 1,
      height: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: COLORS.timetableBorder,
    },
    manualTsDayText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    manualTsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.timetableBorder,
    },
    manualTsPeriodCell: {
      width: normalize(20),
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.textLight5,
    },
    manualTsPeriodText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    manualTsClassCell: {
      flex: 1,
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: COLORS.timetableBorder,
      backgroundColor: COLORS.background,
      padding: normalize(2),
    },
    manualTsClassCellFilled: {
      backgroundColor: COLORS.primaryLight30,
    },
    manualTsClassCellPaintReady: {
      borderWidth: 1,
      borderColor: COLORS.background,
    },
    /** 목록에서 선택한 과목이 격자에 배치된 칸 강조(배경색은 기존 과목색 유지) */
    manualTsClassCellSubjectHighlight: {
      backgroundColor: COLORS.textLight20,
    },
    manualTsClassCellText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textLight20,
      textAlign: 'center',
    },
    manualTsClassCellTextFilled: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.md,
      color: COLORS.textPrimary,
    },
    manualTsSearchInput: {
      borderRadius: normalize(10),
      backgroundColor: COLORS.textLight5,
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(10),
      fontFamily: fonts.regular,
      fontSize: fontSizes.lg,
      color: COLORS.textPrimary,
      marginBottom: normalize(12),
    },
    manualTsSubjectList: {},
    manualTsSubjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(16),
      paddingHorizontal: normalize(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.textLight10,
    },
    manualTsSubjectRowPaintSelected: {
      backgroundColor: COLORS.primaryLight20,
      borderBottomWidth: 0,
    },
    manualTsSubjectDot: {
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(5),
      marginRight: normalize(10),
    },
    manualTsSubjectBody: {
      flex: 1,
    },
    manualTsSubjectTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.textPrimary,
    },
    manualTsSubjectMeta: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
      color: COLORS.textSecondary,
      marginTop: normalize(2),
    },
    /** 완료 후 확인 모달 — timetabelChoice 자동선택 모달과 동일 카피, 스타일만 분리 */
    manualTsDoneModalTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.title,
      color: COLORS.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(10),
    },
    manualTsDoneModalHintWrap: {
      marginBottom: normalize(16),
      alignItems: 'center',
    },
    manualTsDoneModalHintLine: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.xl,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
    },
    manualTsDoneModalHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: normalize(2),
      gap: normalize(4),
    },
    manualTsDoneModalHintAfterIcon: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.xl,
      color: COLORS.textSecondary,
      lineHeight: normalize(22),
    },
    manualTsDoneModalConfirmBtn: {
      height: normalize(42),
      borderRadius: normalize(10),
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualTsDoneModalConfirmText: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.xl,
      color: COLORS.textWhite,
    },
  });
}

/** 편집 화면(EditTimetable) — manualTs와 동일 격자 규격; 최소 10교시, 아코디언에서 최대 교시(상한) 확장 */
export function createEditTimetableScreenStyles(normalize) {
  return StyleSheet.create({
    /** 시간표 높이만큼만 차지 — 아코디언이 격자 바로 아래 오도록 flex 미사용 */
    editTsPageBody: {
      paddingHorizontal: normalize(16),
      paddingTop: normalize(12),
    },
    editTsWrapper: {
      width: '100%',
    },
    editTsTimetableContainer: {
      borderRadius: normalize(8),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.timetableBorder,
    },
    editTsGrid: {
      backgroundColor: COLORS.background,
    },
    /** 교시 추가 푸터(+ 행) — EditTimetable 전용 키 */
    editTsAddPeriodFooterRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.timetableBorder,
    },
    editTsAddPeriodFooterCell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: normalize(35),
      backgroundColor: COLORS.background,
    },
    editTsAddPeriodFooterActions: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      paddingHorizontal: normalize(8),
    },
    editTsAddPeriodFooterIconBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: normalize(20),
    },
    editTsDaysRow: {
      flexDirection: 'row',
      backgroundColor: COLORS.textLight5,
    },
    editTsPeriodHeaderCell: {
      width: normalize(20),
      height: normalize(20),
      backgroundColor: COLORS.textLight5,
    },
    editTsDayCell: {
      flex: 1,
      height: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: COLORS.timetableBorder,
    },
    editTsDayText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    editTsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.timetableBorder,
    },
    editTsPeriodCell: {
      width: normalize(20),
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.textLight5,
    },
    editTsPeriodText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
    },
    editTsClassCell: {
      flex: 1,
      height: normalize(40),
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: COLORS.timetableBorder,
      backgroundColor: COLORS.background,
      padding: normalize(2),
    },
    editTsClassCellFilled: {
      backgroundColor: COLORS.primaryLight30,
    },
    editTsClassCellText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textLight20,
      textAlign: 'center',
    },
    editTsClassCellTextFilled: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.md,
      color: COLORS.textPrimary,
    },
    editTsClassCellSelected: {
      backgroundColor: COLORS.background2,
    },
    editTsKeyboardRoot: {
      flex: 1,
    },
    editTsKeyboardScroll: {
      flex: 1,
    },
    editTsAccordion: {
      marginTop: normalize(4),
      marginHorizontal: normalize(6),
      borderRadius: normalize(10),
      overflow: 'hidden',
    },
    editTsAccordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(14),
    },
    editTsAccordionHeaderTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.xl,
      color: COLORS.textPrimary,
    },
    editTsAccordionChevron: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: COLORS.textSecondary,
      marginLeft: normalize(8),
    },
    editTsAccordionBody: {
      paddingHorizontal: normalize(14),
      paddingTop: normalize(6),
      paddingBottom: normalize(12),
    },
    editTsAccordionCellTitle: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.xl,
      color: COLORS.textPrimary,
      marginBottom: normalize(6),
    },
    editTsAccordionInput: {
      borderWidth: 1,
      borderColor: COLORS.textLight10,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(10),
      fontFamily: fonts.regular,
      fontSize: fontSizes.xl,
      color: COLORS.textPrimary,
      backgroundColor: COLORS.background,
      marginBottom: normalize(12),
    },
    editTsAccordionActions: {
      flexDirection: 'row',
      gap: normalize(8),
    },
    editTsAccordionBtn: {
      flex: 1,
      paddingVertical: normalize(12),
      borderRadius: normalize(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    editTsAccordionBtnMuted: {
      backgroundColor: COLORS.textLight5,
    },
    editTsAccordionBtnDanger: {
      backgroundColor: COLORS.alert,
    },
    editTsAccordionBtnPrimary: {
      backgroundColor: COLORS.primary,
    },
    editTsAccordionBtnTextMuted: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.textSecondary,
    },
    editTsAccordionBtnTextDanger: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.background,
    },
    editTsAccordionBtnTextPrimary: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: COLORS.background,
    },
  });
}

/** EditTimetable 루트 · normalize 불필요(full bleed 배경만 테마 연동) */
export const editTsScreenChromeStyles = StyleSheet.create({
  rootFill: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeFill: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

/** EditTimetable TextInput placeholderTextColor */
export const EDIT_TIMETABLE_INPUT_PLACEHOLDER_COLOR = COLORS.textSecondary;

/** EditTimetable 아코디언 하단 패딩과 함께 쓸 최소값용(scale 반영) */
export function getEditTimetableAccordionMinFooterPadding(normalize) {
  return normalize(8);
}

/**
 * KeyboardAvoidingView keyboardVerticalOffset.
 * 서브헤더가 KAV 안에 있으면 보통 0. 네이티브 스택 헤더만 바깥에 있을 때는 헤더 높이만큼 설정.
 */
export function getEditTimetableKeyboardVerticalOffset() {
  return 0;
}

export default styles;
