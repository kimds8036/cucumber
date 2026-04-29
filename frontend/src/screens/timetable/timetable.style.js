import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const normalize = (size) => size;
const COLORS = {
  ...colors,
  inputBackground: colors.surface,
  selectedBackground: colors.primaryLight20,
  textDisabled: colors.textLight20,
  textTertiary: colors.textSecondary,
  white: colors.textWhite,
};

export const DAYS = ['월', '화', '수', '목', '금'];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7];
export const CELL_HEIGHT = 34;
export const CELL_GAP = 1;
export const PERIOD_COL_WIDTH = 22;

const tableHeight = PERIODS.length * CELL_HEIGHT + (PERIODS.length - 1) * CELL_GAP;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: normalize(16),
    paddingTop: normalize(12),
    paddingBottom: normalize(20),
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
    color: 'rgba(255, 255, 255, 0.75)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
});

export default styles;

