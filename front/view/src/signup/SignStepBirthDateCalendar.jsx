import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { classifyBirthDateCase, getIneligibleAgeDetailMessage } from './signupBirthDatePolicy';
import { buildBirthDate } from './SignStepAgeGate';
import SignupIosSafeModal from './SignupIosSafeModal';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const CALENDAR_ROW_COUNT = 6;
const CALENDAR_CELL_COUNT = CALENDAR_ROW_COUNT * 7;
const CALENDAR_SUNDAY = '#FF8585';
const CALENDAR_SATURDAY = '#6BAEFF';
const PICKER_MIN_DATE = new Date(1900, 0, 1);
const INELIGIBLE_AGE_MESSAGE = '현재 연령으로는 서비스를 이용하실 수 없습니다';
const INELIGIBLE_TOOLTIP_BG = colors.surface;

function getTodayIso() {
  const now = new Date();
  return buildBirthDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function formatSummarySpaced(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return '';
  const [y, m, d] = birthDate.split('-');
  return `${y} 년 ${Number(m)} 월 ${Number(d)} 일`;
}

function resolveInitialBirthDate(initialBirthDate) {
  if (initialBirthDate && /^\d{4}-\d{2}-\d{2}$/.test(initialBirthDate)) {
    return initialBirthDate;
  }
  return getTodayIso();
}

function parseInitialView(birthDate) {
  const resolved = resolveInitialBirthDate(birthDate);
  const [y, m] = resolved.split('-').map(Number);
  return { year: y, month: m - 1 };
}

function clampDayToMonth(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function dateFromView(view, day = 1) {
  const safeDay = clampDayToMonth(view.year, view.month, day);
  return new Date(view.year, view.month, safeDay);
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
  const { width } = useWindowDimensions();
  const initialResolved = useMemo(
    () => resolveInitialBirthDate(initialBirthDate),
    [initialBirthDate],
  );
  const [selectedBirthDate, setSelectedBirthDate] = useState(initialResolved);
  const [view, setView] = useState(() => parseInitialView(initialBirthDate));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [ineligibleDetailVisible, setIneligibleDetailVisible] = useState(false);
  const [pickerDraft, setPickerDraft] = useState(() => dateFromView(parseInitialView(initialBirthDate)));
  const didNotifyInitialRef = useRef(false);
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const dismissingRef = useRef(false);
  const calendarMetrics = useMemo(() => {
    const gridWidth = width - width * 0.14;
    const cellSize = gridWidth / 7;
    return {
      gridHeight: cellSize * CALENDAR_ROW_COUNT,
      cellHeight: cellSize,
    };
  }, [width]);
  const styles = useMemo(
    () => createStyles(normalize, width, calendarMetrics),
    [normalize, width, calendarMetrics],
  );

  const pickerMaxDate = useMemo(() => new Date(), []);

  useEffect(() => {
    if (didNotifyInitialRef.current) return;
    didNotifyInitialRef.current = true;
    if (!initialBirthDate) {
      onBirthDateChange?.(initialResolved);
    }
  }, [initialBirthDate, initialResolved, onBirthDateChange]);

  const birthCase = useMemo(() => {
    if (!selectedBirthDate) return null;
    return classifyBirthDateCase(selectedBirthDate);
  }, [selectedBirthDate]);

  const isIneligibleAge = birthCase === 'A' || birthCase === 'D';

  const ineligibleDetailMessage = useMemo(() => {
    if (!isIneligibleAge) return '';
    return getIneligibleAgeDetailMessage(birthCase);
  }, [birthCase, isIneligibleAge]);

  useEffect(() => {
    setIneligibleDetailVisible(false);
  }, [birthCase, selectedBirthDate]);

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
      });
    }
    while (cells.length < CALENDAR_CELL_COUNT) {
      cells.push({ key: `pad-tail-${cells.length}`, day: null });
    }
    return cells;
  }, [view.month, view.year]);

  const applyPickerSelection = useCallback(
    (date) => {
      if (!date) return;
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const dateStr = buildBirthDate(year, month + 1, day);
      if (!dateStr) return;
      setView({ year, month });
      setPickerDraft(date);
      setSelectedBirthDate(dateStr);
      onBirthDateChange?.(dateStr);
    },
    [onBirthDateChange],
  );

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

  const openPicker = useCallback(() => {
    const selectedDay = selectedBirthDate
      ? Number(selectedBirthDate.split('-')[2])
      : new Date().getDate();
    const draft = dateFromView(view, selectedDay);
    setPickerDraft(draft);
    dismissingRef.current = false;
    setPickerVisible(true);
  }, [selectedBirthDate, view]);

  const dismissPicker = useCallback(
    (afterDismiss) => {
      if (dismissingRef.current) return;

      dismissingRef.current = true;
      sheetTranslateY.stopAnimation();
      overlayOpacity.stopAnimation();
      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          toValue: 600,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        dismissingRef.current = false;
        if (!finished) return;
        setPickerVisible(false);
        afterDismiss?.();
      });
    },
    [overlayOpacity, sheetTranslateY],
  );

  const closePicker = useCallback(() => {
    if (!pickerVisible) return;
    dismissPicker();
  }, [dismissPicker, pickerVisible]);

  const confirmPickerIOS = useCallback(() => {
    const draft = pickerDraft;
    dismissPicker(() => {
      applyPickerSelection(draft);
    });
  }, [applyPickerSelection, dismissPicker, pickerDraft]);

  useEffect(() => {
    if (!pickerVisible) {
      sheetTranslateY.setValue(600);
      overlayOpacity.setValue(0);
      dismissingRef.current = false;
      return;
    }

    overlayOpacity.setValue(1);
    sheetTranslateY.setValue(600);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity, pickerVisible, sheetTranslateY]);

  const handlePickerChange = useCallback(
    (event, date) => {
      if (Platform.OS === 'android') {
        setPickerVisible(false);
        if (event.type === 'dismissed' || !date) return;
        applyPickerSelection(date);
        return;
      }
      if (date) {
        setPickerDraft(date);
      }
    },
    [applyPickerSelection],
  );

  const handleSelectDay = useCallback(
    (cell) => {
      if (!cell.day || !cell.dateStr) return;
      setSelectedBirthDate(cell.dateStr);
      onBirthDateChange?.(cell.dateStr);
    },
    [onBirthDateChange],
  );

  const summaryValue = formatSummarySpaced(selectedBirthDate);

  return (
    <View style={styles.body}>
      <View style={[styles.mainContent, styles.scrollContent]}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goPrevMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="이전 달"
          >
            <Ionicons
              name="chevron-back-circle"
              size={normalize(22)}
              color={colors.background2}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openPicker}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="연월 선택"
          >
            <Text style={styles.monthLabelBtn}>
              {view.year}년 {view.month + 1}월
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goNextMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="다음 달"
          >
            <Ionicons
              name="chevron-forward-circle"
              size={normalize(22)}
              color={colors.background2}
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
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isSelected && dayOfWeek === 0 && styles.sundayText,
                      !isSelected && dayOfWeek === 6 && styles.saturdayText,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>선택한 생년월일</Text>
          <Text style={styles.summaryValue}>{summaryValue}</Text>
          <View
            style={[
              styles.summaryUnderline,
              isIneligibleAge && styles.summaryUnderlineAlert,
            ]}
          />
          {isIneligibleAge ? (
            <View style={styles.ineligibleBlock}>
              <View style={styles.ineligibleRow}>
                <Text style={styles.ineligibleText}>{INELIGIBLE_AGE_MESSAGE}</Text>
                <TouchableOpacity
                  onPress={() => setIneligibleDetailVisible((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="가입 가능 연령 안내"
                  accessibilityState={{ expanded: ineligibleDetailVisible }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={normalize(18)}
                    color={colors.alert}
                  />
                </TouchableOpacity>
              </View>
              {ineligibleDetailVisible ? (
                <View style={styles.ineligibleTooltipWrap}>
                  <View style={styles.ineligibleTooltipPointer} />
                  <View style={styles.ineligibleTooltipBubble}>
                    <Text style={styles.ineligibleDetailText}>
                      {ineligibleDetailMessage}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {Platform.OS === 'ios' ? (
        <SignupIosSafeModal
          visible={pickerVisible}
          transparent
          animationType="none"
          onRequestClose={closePicker}
        >
          <AnimatedPressable
            style={[styles.pickerModalOverlay, { opacity: overlayOpacity }]}
            onPress={closePicker}
          />
          <Animated.View
            style={[
              styles.pickerSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.pickerToolbar}>
              <TouchableOpacity onPress={closePicker} hitSlop={8}>
                <Text style={styles.pickerToolbarBtn}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.pickerToolbarTitle}>생년월일 선택</Text>
              <TouchableOpacity onPress={confirmPickerIOS} hitSlop={8}>
                <Text style={[styles.pickerToolbarBtn, styles.pickerToolbarOk]}>
                  확인
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerWheelContainer}>
              <DateTimePicker
                value={pickerDraft}
                mode="date"
                display="spinner"
                locale="ko-KR"
                minimumDate={PICKER_MIN_DATE}
                maximumDate={pickerMaxDate}
                onChange={handlePickerChange}
                themeVariant="light"
                textColor={colors.textPrimary}
                style={styles.pickerWheel}
              />
            </View>
          </Animated.View>
        </SignupIosSafeModal>
      ) : null}

      {pickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDraft}
          mode="date"
          display="spinner"
          minimumDate={PICKER_MIN_DATE}
          maximumDate={pickerMaxDate}
          onChange={handlePickerChange}
        />
      ) : null}
    </View>
  );
};

function createStyles(normalize, width, calendarMetrics) {
  const { gridHeight, cellHeight } = calendarMetrics;

  return StyleSheet.create({
    body: {
      flex: 1,
      marginHorizontal: -width * 0.04,
      paddingHorizontal: width * 0.07,
    },
    mainContent: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: normalize(4),
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(24),
      paddingHorizontal: normalize(2),
    },
    monthLabelBtn: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textPrimary,
      textAlign: 'center',
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: normalize(12),
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    sundayText: {
      color: CALENDAR_SUNDAY,
    },
    saturdayText: {
      color: CALENDAR_SATURDAY,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      height: gridHeight,
    },
    dayCell: {
      width: `${100 / 7}%`,
      height: cellHeight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircle: {
      width: normalize(38),
      height: normalize(38),
      borderRadius: normalize(19),
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleSelected: {
      backgroundColor: colors.primary,
    },
    dayText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
    },
    dayTextSelected: {
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    summarySection: {
      marginTop: normalize(28),
    },
    summaryLabel: {
      marginBottom: normalize(10),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    summaryValue: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl + 2),
      color: colors.textPrimary,
      paddingBottom: normalize(2),
    },
    summaryUnderline: {
      height: normalize(2),
      backgroundColor: colors.primary,
      borderRadius: normalize(999),
    },
    summaryUnderlineAlert: {
      backgroundColor: colors.alert,
    },
    ineligibleBlock: {
      marginTop: normalize(10),
    },
    ineligibleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    ineligibleText: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.alert,
      lineHeight: normalize(Math.round(fontSizes.lg * 1.45)),
    },
    ineligibleTooltipWrap: {
      marginTop: normalize(6),
      width: '100%',
      alignItems: 'flex-end',
    },
    ineligibleTooltipBubble: {
      width: '100%',
      backgroundColor: INELIGIBLE_TOOLTIP_BG,
      borderRadius: normalize(16),
      borderTopRightRadius: normalize(0),
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
    },
    ineligibleDetailText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: normalize(Math.round(fontSizes.lg * 1.5)),
    },
    pickerModalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayLight,
    },
    pickerSheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(20),
      borderTopRightRadius: normalize(20),
      paddingBottom: normalize(24),
    },
    pickerWheelContainer: {
      width: '100%',
      height: normalize(216),
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerWheel: {
      width: '100%',
      height: normalize(216),
    },
    pickerToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pickerToolbarTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
    },
    pickerToolbarBtn: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
      color: colors.textSecondary,
      minWidth: normalize(44),
    },
    pickerToolbarOk: {
      color: colors.primaryDark,
      textAlign: 'right',
      fontFamily: fonts.bold,
    },
  });
}

export default SignStepBirthDateCalendar;
