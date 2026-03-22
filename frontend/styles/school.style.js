import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';

// 우리 학교 화면 전용 스타일 (학교 정보 + 급식 + 잔디 + 바로가기 + 인기)
export const createOurSchoolStyles = (normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: normalize(16),
      paddingBottom: normalize(16),
    },
    schoolCardBlock: {
      marginBottom: normalize(12),
    },
    schoolCard: {
      alignSelf: 'stretch',
      flexDirection: 'column',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      padding: normalize(16),
      borderWidth: 2,
      borderColor: colors.primary,
    },
    schoolNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
      marginBottom: normalize(6),
    },
    schoolName: {
      fontSize: normalize(22),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(12),
    },
    locationText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginLeft: normalize(4),
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      gap: normalize(10),
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    statValue: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    mealCardBlock: {
      marginBottom: normalize(12),
    },
    mealSectionCard: {
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(10),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    mealSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(8),
      paddingHorizontal: normalize(4),
    },
    mealSectionTitle: {
      fontSize: normalize(16),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      paddingLeft: normalize(4),
    },
    mealSectionMore: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      paddingRight: normalize(4),
    },
    mealCard: {
      alignSelf: 'stretch',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(16),
      padding: normalize(12),
    },
    mealSlotsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: normalize(8),
    },
    mealSlot: {
      flex: 1,
      paddingHorizontal: normalize(6),
    },
    mealSlotLast: {
      // 구분선 제거 후에도 혹시 모를 오버라이드를 위해 남겨둔 스타일
    },
    mealSlotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(4),
    },
    mealSlotTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    mealSlotTitle: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    mealSlotBadge: {
      paddingHorizontal: normalize(5),
      paddingVertical: normalize(2),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryLight30,
    },
    mealSlotBadgeText: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    mealSlotMenus: {
      minHeight: normalize(80),
      justifyContent: 'flex-start',
    },
    mealSlotMenuText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    mealSlotEmptyText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    mealCardTop: {
      flexDirection: 'column',
      paddingBottom: normalize(10),
    },
    mealTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    mealLabel: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(2),
    },
    mealType: {
      fontSize: normalize(14),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    mealItemsWrap: {
      flexDirection: 'column',
    },
    mealItem: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    mealMore: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
      textAlign: 'right',
    },
    grassCard: {
      borderRadius: normalize(16),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(10),
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    grassCardTitle: {
      fontSize: normalize(16),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(4),
      paddingLeft: normalize(4),
    },
    shortcutContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: normalize(12),
      gap: normalize(12),
    },
    shortcutButton: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      padding: normalize(16),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    shortcutTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      marginBottom: normalize(8),
    },
    shortcutTitle: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    shortcutSubtitle: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    popularSection: {
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      padding: normalize(16),
      marginBottom: normalize(12),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    popularHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(16),
      gap: normalize(6),
    },
    popularTitle: {
      fontSize: normalize(18),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    popularItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: normalize(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    popularItemLast: {
      borderBottomWidth: 0,
    },
    popularItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: normalize(8),
    },
    popularItemTitle: {
      fontSize: normalize(14),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      flex: 1,
    },
    popularItemRight: {
      flexDirection: 'row',
      gap: normalize(8),
    },
    countBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(2),
    },
    countText: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
};

/** 학교 우편 보내기(SendSchoolMail) — SendMail과 동일 레이아웃, 스타일 키만 schoolSend* 로 구분 */
export function createSendSchoolMailStyles(normalize) {
  return StyleSheet.create({
    schoolSendOuter: {
      flex: 1,
      backgroundColor: colors.background,
    },
    schoolSendSafe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    schoolSendKeyboard: {
      flex: 1,
    },
    schoolSendScroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    schoolSendScrollContent: {
      flexGrow: 1,
      padding: normalize(16),
    },
    schoolSendSection: {
      backgroundColor: colors.background,
      marginHorizontal: 0,
      paddingHorizontal: normalize(16),
      paddingTop: normalize(18),
      paddingBottom: normalize(24),
      marginTop: normalize(12),
      borderRadius: normalize(12),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    schoolSendFieldLabel: {
      fontSize: normalize(16),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(12),
    },
    schoolSendSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      height: normalize(48),
    },
    schoolSendFixedSchoolBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(12),
      gap: normalize(10),
    },
    schoolSendFixedSchoolTexts: {
      flex: 1,
    },
    schoolSendFixedSchoolName: {
      fontSize: normalize(15),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    schoolSendFixedSchoolAddress: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(18),
    },
    schoolSendSearchInput: {
      flex: 1,
      fontSize: normalize(15),
      color: colors.textPrimary,
      paddingHorizontal: normalize(8),
    },
    schoolSendResultsBox: {
      marginTop: normalize(8),
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      borderWidth: normalize(1),
      borderColor: colors.textLight10,
      overflow: 'hidden',
    },
    schoolSendResultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: normalize(16),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight5,
    },
    schoolSendResultTitle: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    schoolSendResultId: {
      fontSize: normalize(13),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    schoolSendResultSub: {
      fontSize: normalize(13),
      color: colors.textSecondary,
    },
    schoolSendStudentBlock: {
      flex: 1,
    },
    schoolSendEmptyBox: {
      padding: normalize(24),
      alignItems: 'center',
    },
    schoolSendEmptyText: {
      fontSize: normalize(14),
      color: colors.textSecondary,
    },
    schoolSendDormantTag: {
      backgroundColor: colors.red,
      borderRadius: normalize(12),
      paddingVertical: normalize(4),
      paddingHorizontal: normalize(8),
      marginRight: normalize(8),
    },
    schoolSendDormantTagText: {
      fontSize: normalize(11),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    schoolSendBodyWrap: {
      backgroundColor: colors.textLight5,
      borderRadius: normalize(12),
      padding: normalize(12),
      flex: 1,
    },
    schoolSendBodyInput: {
      flex: 1,
      fontSize: normalize(15),
      color: colors.textPrimary,
    },
    schoolSendMetaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginTop: 'auto',
    },
    schoolSendCharCount: {
      fontSize: normalize(11),
      color: colors.textSecondary,
      fontFamily: fonts.regular,
    },
    schoolSendAdChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalize(3),
      paddingHorizontal: normalize(10),
      borderRadius: normalize(20),
      backgroundColor: colors.primaryLight30,
    },
    schoolSendAdChipText: {
      fontSize: normalize(11),
      marginLeft: normalize(4),
      color: colors.textPrimary,
      fontFamily: fonts.regular,
    },
    schoolSendCtaBar: {
      paddingHorizontal: normalize(16),
      paddingBottom: normalize(16),
      paddingTop: normalize(8),
      backgroundColor: colors.background,
    },
    schoolSendCtaBtn: {
      backgroundColor: colors.primary,
      borderRadius: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(14),
    },
    schoolSendCtaBtnDisabled: {
      backgroundColor: colors.primaryLight30,
    },
    schoolSendCtaLabel: {
      fontSize: normalize(15),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
  });
}
