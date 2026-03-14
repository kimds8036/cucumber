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
    topRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: normalize(12),
      marginBottom: normalize(12),
    },
    schoolCard: {
      flex: 7,
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
    mealCard: {
      flex: 3,
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(16),
      padding: normalize(16),
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
      marginBottom: normalize(4),
    },
    mealMore: {
      fontSize: normalize(12),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    grassCard: {
      borderRadius: normalize(16),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(8),
      marginBottom: normalize(12),
      borderWidth: 1,
      borderColor: colors.textLight10,
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
      borderWidth: 1,
      borderColor: colors.textLight10,
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
      borderWidth: 1,
      borderColor: colors.textLight10,
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
      fontSize: normalize(13),
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
      fontSize: normalize(12),
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
