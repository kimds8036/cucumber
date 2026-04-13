import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';
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
      paddingTop: normalize(8),
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
      marginTop: normalize(6),
    },
    schoolName: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginLeft: normalize(4),
    },
    schoolInfoDivider: {
      alignSelf: 'stretch',
      backgroundColor: colors.textLight10,
      marginTop: normalize(15),
      marginBottom: normalize(15),
      height: 1,
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
      fontSize: normalize(fontSizes.xl),
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
      ...shadow.md,
    },
    mealSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(8),
      paddingHorizontal: normalize(4),
    },
    mealSectionTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      paddingLeft: normalize(4),
    },
    mealSectionMore: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      paddingRight: normalize(4),
    },
    mealCard: {
      alignSelf: 'stretch',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-start',
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(16),
      padding: normalize(12),
    },
    mealSlotsRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      marginBottom: normalize(8),
    },
    mealSlot: {
      flex: 1,
      flexDirection: 'column',
      paddingHorizontal: normalize(6),
    },
    mealSlotTouch: {
      flex: 1,
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
      fontSize: normalize(fontSizes.xl),
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
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    mealSlotMenus: {
      minHeight: normalize(80),
      justifyContent: 'flex-start',
    },
    mealSlotMenuText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    mealSlotEmptyText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    mealModalBackdrop: {
      flex: 1,
      backgroundColor: colors.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
    },
    mealModalCard: {
      width: '60%',
      maxHeight: '80%',
      backgroundColor: colors.green,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
    },
    mealModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(10),
    },
    mealModalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    mealModalTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    mealModalBadge: {
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryLight30,
    },
    mealModalBadgeText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    mealModalMenuText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(24),
      marginBottom: normalize(6),
    },
    mealModalEmptyText: {
      fontSize: normalize(fontSizes.xl),
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
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(2),
    },
    mealType: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    mealItemsWrap: {
      flexDirection: 'column',
    },
    mealItem: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    mealMore: {
      fontSize: normalize(fontSizes.lg),
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
      ...shadow.md,
    },
    grassCardTitle: {
      fontSize: normalize(fontSizes.xxl),
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
      ...shadow.md,
    },
    shortcutTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      marginBottom: normalize(8),
    },
    shortcutTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    shortcutSubtitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    popularSection: {
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      padding: normalize(16),
      marginBottom: normalize(12),
      ...shadow.md,
    },
    popularHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(16),
      gap: normalize(6),
    },
    popularTitle: {
      fontSize: normalize(fontSizes.title),
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
      fontSize: normalize(fontSizes.xl),
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
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
};

// 학교 우편함 리스트 전용 스타일 (2열 그리드)
export const createSchoolMailStyles = (width, normalize) => {
  const cardWidth = (width * 0.92 - normalize(8)) / 2; // padding 4% each side, gap 8
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
    // 학교 정보 바: OO고등학교 • 총 N통 | NEW 2
    schoolInfoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(10),
      paddingBottom: normalize(6),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    schoolInfoText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    schoolNewBadge: {
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(4),
      borderRadius: normalize(14),
      backgroundColor: colors.primaryLight30,
    },
    schoolNewBadgeText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
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
      ...shadow.md,
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
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    cardPreview: {
      fontSize: normalize(fontSizes.lg),
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
      fontSize: normalize(fontSizes.lg),
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
        fontSize: normalize(fontSizes.lg),
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
        ...shadow.lg,
      },
    });
};

