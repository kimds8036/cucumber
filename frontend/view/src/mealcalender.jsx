import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createCalendarStyles } from '../../styles/calender.style';

// 요일 레이블 (일=0, 일요일 먼저)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 간단 더미 데이터: 실제로는 서버/food.py 기반으로 교체 예정
// 키는 'YYYYMMDD', 값은 dayBadge + 식사 종류별 메뉴와 칼로리
const SAMPLE_MEALS = {
  // 예시: 2026년 3월 17일
  '20260317': {
    dayBadge: '월',
    meals: {
      breakfast: ['토스트', '우유', '샐러드'],
      lunch: ['김치찌개', '잡채', '계란말이', '흰쌀밥'],
      dinner: ['부대찌개', '깍두기', '어묵볶음', '흰쌀밥'],
    },
    calories: {
      breakfast: '550 Kcal',
      lunch: '850 Kcal',
      dinner: '900 Kcal',
    },
  },
  // 예시: 2026년 3월 18일
  '20260318': {
    dayBadge: '화',
    meals: {
      lunch: ['된장찌개', '멸치볶음', '시금치나물', '흰쌀밥'],
    },
    calories: {
      lunch: '780 Kcal',
    },
  },
  // 예시: 2026년 3월 19일 (중식만 없음)
  '20260319': {
    dayBadge: '수',
    meals: {
      dinner: ['비빔밥', '미역국', '깍두기', '흰쌀밥'],
    },
    calories: {
      dinner: '820 Kcal',
    },
  },
};

const MEAL_LABEL = {
  breakfast: '조식',
  lunch: '중식',
  dinner: '석식',
};

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const buildMonthMatrix = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay(); // 일=0 기준 (0=일요일)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let currentDay = 1 - firstWeekday;

  while (currentDay <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      if (currentDay < 1 || currentDay > daysInMonth) {
        week.push(null);
      } else {
        week.push(currentDay);
      }
      currentDay += 1;
    }
    weeks.push(week);
  }

  return weeks;
};

const MealCalender = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createCalendarStyles(width, normalize), [width, normalize]);

  const now = new Date();
  const initialYear = now.getFullYear();
  const initialMonth = now.getMonth(); // 0-based

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [monthMatrix, setMonthMatrix] = useState(() => buildMonthMatrix(initialYear, initialMonth));

  // 오늘 날짜 YYYYMMDD
  const todayYmd = useMemo(() => {
    const mm = String(initialMonth + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${initialYear}${mm}${dd}`;
  }, [initialYear, initialMonth, now]);

  // 선택된 날짜 (YYYYMMDD) - 기본: 오늘
  const [selectedDate, setSelectedDate] = useState(todayYmd);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMonthMatrix(buildMonthMatrix(year, month));
    // 월 이동 시 선택 날짜 초기화 (급식 상세 접힘)
    setSelectedDate(null);
  }, [year, month]);

  const handlePrevMonth = () => {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    const today = new Date();
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    if (nextYear > today.getFullYear() || (nextYear === today.getFullYear() && nextMonth > today.getMonth())) {
      return;
    }
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const today = new Date();
  const isViewingCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const formatYMD = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}${mm}${dd}`;
  };

  const onPressDate = (day) => {
    if (!day) return;
    const key = formatYMD(year, month, day);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate((prev) => (prev === key ? null : key));
  };

  const renderDayCell = (day, colIndex, isLastRow) => {
    const isLastCol = colIndex === 6;

    if (!day) {
      return (
        <View
          key={`empty-${colIndex}-${isLastRow ? 'last' : 'row'}`}
          style={[
            styles.dayCell,
            isLastCol && styles.dayCellLast,
          ]}
        />
      );
    }

    const key = formatYMD(year, month, day);
    const mealInfo = SAMPLE_MEALS[key];
    const isToday =
      day === now.getDate() &&
      month === now.getMonth() &&
      year === now.getFullYear();
    const isSelected = selectedDate === key;
    const hasMeals = !!mealInfo;

    const numberTextBase = [styles.dayNumber];
    if (colIndex === 0) {
      numberTextBase.push(styles.sundayText);
    } else if (colIndex === 6) {
      numberTextBase.push(styles.saturdayText);
    }

    let circleStyle = [styles.dayNumberCircle];
    let numberTextStyle = numberTextBase;

    if (isToday) {
      circleStyle = [...circleStyle, styles.todayCircle];
      numberTextStyle = [...numberTextBase, styles.circleText];
    }
    if (isSelected) {
      circleStyle = [...circleStyle, styles.selectedCircle];
      numberTextStyle = [...numberTextBase, styles.circleText];
    }

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.8}
        onPress={() => onPressDate(day)}
        style={[
          styles.dayCell,
          isLastCol && styles.dayCellLast,
        ]}
      >
        <View style={circleStyle}>
          <Text style={numberTextStyle}>{day}</Text>
        </View>
        {hasMeals ? (
          <MaterialCommunityIcons
            name="rice"
            color={colors.primary}
            style={styles.mealIcon}
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  const monthLabel = `${year}년 ${month + 1}월`;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.monthHeader}>
          <TouchableOpacity style={styles.monthNav} onPress={handlePrevMonth} activeOpacity={0.7}>
            <Ionicons
              name="chevron-back"
              size={normalize(18)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <TouchableOpacity
            style={styles.monthNav}
            onPress={handleNextMonth}
            activeOpacity={0.7}
            disabled={isViewingCurrentMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={normalize(18)}
              color={isViewingCurrentMonth ? colors.background : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w, idx) => (
            <View key={w} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayText,
                  idx === 0 && styles.sundayText,
                  idx === 6 && styles.saturdayText,
                ]}
              >
                {w}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {monthMatrix.map((week, rowIndex) => (
            <View
              key={`week-${rowIndex}`}
              style={[
                styles.weekRow,
                rowIndex === monthMatrix.length - 1 && styles.weekRowLast,
              ]}
            >
              {week.map((day, colIndex) =>
                renderDayCell(day, colIndex, rowIndex === monthMatrix.length - 1),
              )}
            </View>
          ))}
        </View>

        {/* 급식 상세 영역 */}
        {selectedDate && (
          <View style={styles.mealDetail}>
            {SAMPLE_MEALS[selectedDate] ? (
              <View style={styles.mealDetailRow}>
                {['breakfast', 'lunch', 'dinner'].map((mealType) => {
                  const label = MEAL_LABEL[mealType] || mealType;
                  const mealsForDay = SAMPLE_MEALS[selectedDate];
                  const menus =
                    mealsForDay.meals && mealsForDay.meals[mealType];
                  const calories =
                    mealsForDay.calories && mealsForDay.calories[mealType];

                  const hasMenus = menus && menus.length > 0;

                  return (
                    <View key={mealType} style={styles.mealDetailCard}>
                      <View style={styles.mealDetailHeader}>
                        <View style={styles.mealDetailTitleRow}>
                          <Text style={styles.mealDetailType}>{label}</Text>
                        </View>
                      </View>
                      <View>
                        {hasMenus ? (
                          menus.map((menu, idx) => (
                            <Text
                              key={`${selectedDate}-${mealType}-${idx}`}
                              style={styles.mealDetailMenu}
                            >
                              {menu}
                            </Text>
                          ))
                        ) : (
                          <Text style={styles.mealDetailMenuEmpty}>
                            급식 정보가 없어요
                          </Text>
                        )}
                        {calories ? (
                          <Text
                            style={{
                              fontSize: normalize(11),
                              color: colors.textSecondary,
                              marginTop: normalize(4),
                            }}
                          >
                            {calories}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noMealText}>
                급식 정보가 없어요
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MealCalender;

