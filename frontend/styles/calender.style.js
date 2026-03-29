import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createCalendarStyles = (width, normalize) => {
  const dayCellSize = (width - normalize(32)) / 7;

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
      // 서브헤더가 차지하던 상단 여백만큼 보정
      paddingTop: normalize(60),
      paddingBottom: normalize(24),
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      width: normalize(22),
      height: normalize(22),
      borderRadius: normalize(11),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(2),
    },
    // 오늘 날짜 원형 배경
    todayCircle: {
      backgroundColor: '#a6da95',
    },
    // 선택된 날짜 원형 배경
    selectedCircle: {
      backgroundColor: colors.textSecondary,
    },
    // 오늘/선택 원 안의 숫자 색상
    circleText: {
      color: '#ffffff',
    },
    // 일요일 날짜 텍스트
    sundayText: {
      color: '#9EC0FF',
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
      color: '#999999',
      paddingVertical: normalize(20),
    },
    // 급식 상세 3개 카드 행
    mealDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: normalize(8),
    },
    // 급식 상세 카드
    mealDetailCard: {
      borderRadius: normalize(16),
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
      backgroundColor: '#edf7ed',
      marginBottom: normalize(10),
      flex: 1,
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

