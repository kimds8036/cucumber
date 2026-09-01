import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { getBirthDateBoundaries } from './signupBirthDatePolicy';
import { buildBirthDate } from './SignStepAgeGate';
import SignupStepScroll from './SignupStepScroll';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatSummary(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return '';
  const [y, m, d] = birthDate.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function parseInitialView(birthDate) {
  if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const [y, m] = birthDate.split('-').map(Number);
    return { year: y, month: m - 1 };
  }
  const { maxYear } = getBirthDateBoundaries();
  return { year: maxYear, month: 0 };
}

function isDateSelectable(year, month, day) {
  const dateStr = buildBirthDate(year, month + 1, day);
  if (!dateStr) return false;
  const { minDate, tooYoungCutoff } = getBirthDateBoundaries();
  return dateStr >= minDate && dateStr < tooYoungCutoff;
}

/**
 * 애플 회원가입 전용 생년월일 달력 UI
 * @param {object} props
 * @param {(n: number) => number} props.normalize
 * @param {string} [props.initialBirthDate]
 * @param {(birthDate: string) => void} props.onBirthDateChange
 * @param {number} [props.bottomOffset]
 */
const SignStepBirthDateCalendar = ({
  normalize,
  initialBirthDate = '',
  onBirthDateChange,
  bottomOffset = 0,
}) => {
  const [selectedBirthDate, setSelectedBirthDate] = useState(initialBirthDate);
  const [view, setView] = useState(() => parseInitialView(initialBirthDate));
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const monthLabel = `${view.year}년 ${view.month + 1}월`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(view.year, view.month, 1);
    const lastDay = new Date(view.year, view.month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells = [];
    for (let i = 0; i < startPad; i += 1) {
      cells.push({ key: `pad-${i}`, day: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = buildBirthDate(view.year, view.month + 1, day);
      cells.push({
        key: dateStr || `day-${day}`,
        day,
        dateStr,
        selectable: isDateSelectable(view.year, view.month, day),
      });
    }
    return cells;
  }, [view.month, view.year]);

  const goPrevMonth = useCallback(() => {
    setView((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 },
    );
  }, []);

  const goNextMonth = useCallback(() => {
    setView((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 },
    );
  }, []);

  const handleSelectDay = useCallback(
    (cell) => {
      if (!cell.day || !cell.selectable || !cell.dateStr) return;
      setSelectedBirthDate(cell.dateStr);
      onBirthDateChange?.(cell.dateStr);
    },
    [onBirthDateChange],
  );

  const summaryText = selectedBirthDate
    ? `선택한 생년월일: ${formatSummary(selectedBirthDate)}`
    : '날짜를 선택해 주세요';

  return (
    <SignupStepScroll
      normalize={normalize}
      bottomOffset={bottomOffset}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={goPrevMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="이전 달"
        >
          <Ionicons
            name="chevron-back"
            size={normalize(22)}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={goNextMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="다음 달"
        >
          <Ionicons
            name="chevron-forward"
            size={normalize(22)}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, idx) => (
          <Text
            key={label}
            style={[
              styles.weekdayLabel,
              idx === 0 && styles.sundayText,
              idx === 6 && styles.saturdayText,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {calendarDays.map((cell) => {
          if (!cell.day) {
            return <View key={cell.key} style={styles.dayCell} />;
          }
          const isSelected = cell.dateStr === selectedBirthDate;
          const dayOfWeek = new Date(view.year, view.month, cell.day).getDay();
          return (
            <TouchableOpacity
              key={cell.key}
              style={styles.dayCell}
              onPress={() => handleSelectDay(cell)}
              disabled={!cell.selectable}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                  !cell.selectable && styles.dayCircleDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    dayOfWeek === 0 && styles.sundayText,
                    dayOfWeek === 6 && styles.saturdayText,
                    isSelected && styles.dayTextSelected,
                    !cell.selectable && styles.dayTextDisabled,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.summary}>{summaryText}</Text>
    </SignupStepScroll>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    scrollContent: {
      paddingTop: normalize(8),
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(20),
      paddingHorizontal: normalize(4),
    },
    monthLabel: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.lg,
      color: colors.textPrimary,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: normalize(8),
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
      color: colors.textMuted,
    },
    sundayText: {
      color: colors.subcolor,
    },
    saturdayText: {
      color: colors.alertDark,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircle: {
      width: normalize(36),
      height: normalize(36),
      borderRadius: normalize(18),
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleSelected: {
      backgroundColor: colors.primary,
    },
    dayCircleDisabled: {
      opacity: 0.35,
    },
    dayText: {
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: colors.textPrimary,
    },
    dayTextSelected: {
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    dayTextDisabled: {
      color: colors.textMuted,
    },
    summary: {
      marginTop: normalize(24),
      textAlign: 'center',
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: colors.textPrimary,
    },
  });
}

export default SignStepBirthDateCalendar;
