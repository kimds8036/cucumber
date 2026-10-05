/**
 * 위클리 주 선택 — 일~토 한 줄을 통째로 고르는 달력.
 * 안드로이드 기본 달력은 모양을 바꿀 수 없어서, 양쪽 모두 이 시트를 쓴다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import { getTimerDayKey } from '../../../utils/timerStorage';
import TimerYearMonthPicker from './TimerYearMonthPicker';
import { WEEKLY_MIN_MONTH, WEEKLY_MIN_WEEK_KEY } from './useTimerWeekly';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad2 = (n) => String(n).padStart(2, '0');
const toDayKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

function weekStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

function buildWeeks(year, month) {
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < total; i += 1) {
    const date = new Date(year, month, i - startPad + 1);
    cells.push({
      date,
      day: date.getDate(),
      dayKey: toDayKey(date),
      inMonth: date.getMonth() === month,
    });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function TimerDatePicker({
  visible,
  value,
  title = '주 선택',
  onConfirm,
  onClose,
  styles,
  normalize,
}) {
  const [draft, setDraft] = useState(value);
  const [cursor, setCursor] = useState(() => ({
    year: value.getFullYear(),
    month: value.getMonth(),
  }));
  const [ymVisible, setYmVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const dismissingRef = useRef(false);
  const todayKey = getTimerDayKey(new Date());
  const minIndex = WEEKLY_MIN_MONTH.year * 12 + WEEKLY_MIN_MONTH.month;
  const maxMonth = {
    year: Math.max(cursor.year, new Date().getFullYear()) + 5,
    month: 11,
  };

  useEffect(() => {
    if (!visible) return;
    const start = weekStart(value);
    const startKey = toDayKey(start);
    const safeStart = startKey < WEEKLY_MIN_WEEK_KEY
      ? weekStart(new Date(WEEKLY_MIN_MONTH.year, WEEKLY_MIN_MONTH.month, 1))
      : start;
    setDraft(safeStart);
    const monthIndex = safeStart.getFullYear() * 12 + safeStart.getMonth();
    setCursor(
      monthIndex < minIndex
        ? { year: WEEKLY_MIN_MONTH.year, month: WEEKLY_MIN_MONTH.month }
        : { year: safeStart.getFullYear(), month: safeStart.getMonth() },
    );
    setYmVisible(false);
    dismissingRef.current = false;
    sheetTranslateY.setValue(600);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const weeks = useMemo(
    () => buildWeeks(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
  const selectedKey = toDayKey(weekStart(draft));

  const dismiss = (afterDismiss) => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.timing(sheetTranslateY, {
      toValue: 600,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      dismissingRef.current = false;
      onClose();
      afterDismiss?.();
    });
  };

  const confirm = () => {
    dismiss(() => onConfirm(weekStart(draft)));
  };

  const cursorIndex = cursor.year * 12 + cursor.month;
  const canPrevMonth = cursorIndex > minIndex;

  const shiftMonth = (delta) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      const nextIndex = next.getFullYear() * 12 + next.getMonth();
      if (nextIndex < minIndex) return prev;
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => dismiss()}
      statusBarTranslucent
    >
      <View style={{ width: Dimensions.get('screen').width, height: Dimensions.get('screen').height }}>
      <View style={styles.ymOverlay}>
        <Pressable style={styles.ymOverlayTouch} onPress={() => dismiss()} />
      </View>
      <Animated.View
        style={[styles.ymSheet, { transform: [{ translateY: sheetTranslateY }] }]}
      >
        <View style={styles.ymToolbar}>
          <TouchableOpacity onPress={() => dismiss()} hitSlop={8}>
            <Text style={styles.ymToolbarBtn}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.ymToolbarTitle}>{title}</Text>
          <TouchableOpacity onPress={confirm} hitSlop={8}>
            <Text style={[styles.ymToolbarBtn, styles.ymToolbarOk]}>확인</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekCalBody}>
          <View style={styles.weekCalHeader}>
            <TouchableOpacity
              onPress={() => shiftMonth(-1)}
              disabled={!canPrevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="이전 달"
            >
              <Ionicons
                name="caret-back"
                size={normalize(14)}
                color={canPrevMonth ? colors.text : colors.textLight2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setYmVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="연월 선택"
            >
              <Text style={styles.weekCalMonth}>
                {`${cursor.year}년 ${cursor.month + 1}월`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="다음 달"
            >
              <Ionicons name="caret-forward" size={normalize(14)} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.grassWeekdayRow}>
            {WEEKDAYS.map((label, index) => (
              <Text
                key={label}
                style={[
                  styles.grassWeekdayText,
                  index === 0 && styles.weekCalSunday,
                  index === 6 && styles.weekCalSaturday,
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.weekCalGrid}>
          {weeks.map((week) => {
            const weekKey = week[0].dayKey;
            const selected = weekKey === selectedKey;
            return (
              <TouchableOpacity
                key={weekKey}
                activeOpacity={0.7}
                onPress={() => {
                  if (weekKey < WEEKLY_MIN_WEEK_KEY) return;
                  setDraft(week[0].date);
                }}
                style={[styles.weekCalRow, selected && styles.weekCalRowSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                {week.map((cell, index) => {
                  const isToday = cell.dayKey === todayKey;
                  const isSunday = index === 0;
                  const isSaturday = index === 6;
                  const muted = !cell.inMonth && !selected;
                  return (
                    <View key={cell.dayKey} style={styles.weekCalDay}>
                      <Text
                        style={[
                          styles.weekCalDayText,
                          muted && styles.weekCalDayTextOutside,
                          isSunday && styles.weekCalSunday,
                          isSaturday && styles.weekCalSaturday,
                          muted && isSunday && styles.weekCalSundayMuted,
                          muted && isSaturday && styles.weekCalSaturdayMuted,
                          (selected || isToday) && styles.weekCalDayTextSelected,
                          isToday && !isSunday && !isSaturday && styles.weekCalDayTextToday,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
            );
          })}
          </View>
        </View>
      </Animated.View>
      </View>
    </Modal>
    <TimerYearMonthPicker
      visible={visible && ymVisible}
      value={cursor}
      min={WEEKLY_MIN_MONTH}
      max={maxMonth}
      onConfirm={(picked) => {
        setCursor(picked);
        setYmVisible(false);
      }}
      onClose={() => setYmVisible(false)}
      styles={styles}
      normalize={normalize}
    />
    </>
  );
}
