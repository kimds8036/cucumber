import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createCalendarStyles = (width, normalize) => {
  const dayCellSize = (width - normalize(32)) / 7;
  // Android는 borderRadius를 과도하게 크게 주면 사각형에 가깝게 그려지는 경우가 있어,
  // 크기의 절반으로 고정하고 overflow로 배경을 클립한다.
  const dayNumberCircleSize = normalize(22);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: normalize(16),
      paddingTop: normalize(8),
      paddingBottom: normalize(24),
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: normalize(60),
      paddingHorizontal: normalize(16),
      marginBottom: normalize(12),
    },
    monthTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    monthNavText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    weekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: normalize(4),
    },
    weekdayCell: {
      width: dayCellSize,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(4),
    },
    weekdayText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    calendarGrid: {
      borderRadius: normalize(12),
      borderWidth: 1,
      borderColor: colors.textLight10,
      overflow: 'hidden',
    },
    weekRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    weekRowLast: {
      borderBottomWidth: 0,
    },
    dayCell: {
      width: dayCellSize,
      minHeight: dayCellSize + normalize(20),
      paddingTop: normalize(6),
      borderRightWidth: 1,
      borderRightColor: colors.textLight10,
      alignItems: 'center',
    },
    dayCellLast: {
      borderRightWidth: 0,
    },
    dayNumber: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    // 날짜 숫자 원형 배경 공통
    dayNumberCircle: {
      width: dayNumberCircleSize,
      height: dayNumberCircleSize,
      borderRadius: dayNumberCircleSize / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(2),
    },
    // 오늘 날짜 원형 배경
    todayCircle: {
      backgroundColor: colors.primary,
    },
    // 선택된 날짜 원형 배경
    selectedCircle: {
      backgroundColor: colors.textSecondary,
    },
    // 오늘/선택 원 안의 숫자 색상
    circleText: {
      color: colors.textWhite,
    },
    // 일요일 날짜 텍스트
    sundayText: {
      color: colors.subcolor,
    },
    // 토요일 날짜 텍스트
    saturdayText: {
      color: colors.alert,
    },
    // 급식 이모지
    mealIcon: {
      fontSize: normalize(fontSizes.title),
      marginTop: normalize(3),
      marginBottom: normalize(0),
    },
    // 급식 상세 영역 컨테이너
    mealDetail: {
      marginTop: normalize(12),
      paddingHorizontal: normalize(4),
    },
    // 급식 없음 텍스트
    noMealText: {
      textAlign: 'center',
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight40,
      paddingVertical: normalize(20),
    },
    // 급식 상세 3개 카드 행
    mealDetailRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: normalize(2),
    },
    // 급식 상세 카드
    mealDetailCard: {
      borderRadius: normalize(16),
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
      backgroundColor: colors.primaryLight20,
      marginBottom: normalize(10),
      width: '100%',
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
    mealDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(6),
    },
    mealDetailTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    mealDetailType: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    mealDetailMenu: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(2),
    },
    mealDetailMenuEmpty: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(12),
      marginTop: normalize(12),
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    legendDot: {
      width: normalize(8),
      height: normalize(8),
      borderRadius: normalize(4),
      backgroundColor: colors.primary,
    },
    legendText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
};

