/**
 * 타이머 플래너 — 공부 잔디 (한 달 달력 + 날짜별 공부 시간)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import Skeleton from '../../../components/common/Skeleton';
import { getTimerDayKey } from '../../../utils/timerStorage';
import TimerYearMonthPicker from './TimerYearMonthPicker';
import { fetchStudyGrassMonth } from './studyGrassApi';
import { WEEKLY_MIN_MONTH } from './useTimerWeekly';
import {
  getGrassColor,
  formatGrassDuration,
  GRASS_LEGEND,
} from './studyGrassHelpers';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const pad2 = (n) => String(n).padStart(2, '0');
const toDayKey = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;
const toMonthIndex = ({ year, month }) => year * 12 + month;

function parseDayKey(dayKey) {
  const [y, m] = dayKey.split('-').map(Number);
  return { year: y, month: m - 1 };
}

/** 화면 확인용 더미 잔디. 서버 결과 위에 덧붙이며, 테스트가 끝나면 false로 끈다 */
const DEBUG_STUDY_GRASS_DUMMY = __DEV__ && false로;
const DUMMY_GRASS_MINUTES = [0, 150, 290, 485, 640, 760, 35, 0, 265, 455, 610, 800, 95];

function buildDummyMonth(year, month, todayKey) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const secondsByDay = {};
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = toDayKey(year, month, day);
    if (dayKey > todayKey) break;
    const minutes = DUMMY_GRASS_MINUTES[(day * 7 + month) % DUMMY_GRASS_MINUTES.length];
    if (minutes > 0) secondsByDay[dayKey] = minutes * 60;
  }
  return secondsByDay;
}

/** 일요일 시작 · 앞뒤 달 날짜로 줄을 채운 칸 목록 */
function buildMonthCells(year, month) {
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < total; i += 1) {
    const d = new Date(year, month, i - startPad + 1);
    cells.push({
      day: d.getDate(),
      dayKey: toDayKey(d.getFullYear(), d.getMonth(), d.getDate()),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

export default function TimerStudyGrass({
  styles,
  normalize,
  onOpenDayRecord,
  refreshSec = null,
}) {
  const todayKey = getTimerDayKey(new Date());
  const maxMonth = parseDayKey(todayKey);
  const minMonth = WEEKLY_MIN_MONTH;
  const [view, setView] = useState(() => parseDayKey(todayKey));
  const [secondsByDay, setSecondsByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  const viewIdx = toMonthIndex(view);
  const canPrev = viewIdx > toMonthIndex(minMonth);
  const canNext = viewIdx < toMonthIndex(maxMonth);
  const shiftMonth = (delta) => {
    if (delta < 0 && !canPrev) return;
    if (delta > 0 && !canNext) return;
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchStudyGrassMonth(view.year, view.month)
      .then((data) => {
        if (!alive) return;
        const real = data || {};
        setSecondsByDay(
          DEBUG_STUDY_GRASS_DUMMY
            ? { ...buildDummyMonth(view.year, view.month, todayKey), ...real }
            : real,
        );
      })
      .catch(() => {
        if (alive) setSecondsByDay({});
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [view.year, view.month, refreshSec]);

  const monthTotalLabel = useMemo(() => {
    const totalSeconds = Object.values(secondsByDay).reduce((sum, s) => sum + (s || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${view.month + 1}월: ${h}H ${m}M`;
  }, [secondsByDay, view.month]);

  const weeks = useMemo(() => {
    const cells = buildMonthCells(view.year, view.month);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [view.year, view.month]);

  const canPressCell = (cell) => {
    if (!cell.inMonth) {
      const idx = toMonthIndex(parseDayKey(cell.dayKey));
      return idx >= toMonthIndex(minMonth) && idx <= toMonthIndex(maxMonth);
    }
    return cell.dayKey < todayKey;
  };

  const handleCellPress = (cell) => {
    if (!cell.inMonth) {
      setView(parseDayKey(cell.dayKey));
      return;
    }
    onOpenDayRecord?.(cell.dayKey, secondsByDay[cell.dayKey] ?? 0);
  };

  return (
    <View style={styles.grassWrap}>
      <View style={styles.grassHeader}>
        <TouchableOpacity
          style={styles.grassNavBtn}
          onPress={() => shiftMonth(-1)}
          disabled={!canPrev}
          accessibilityLabel="이전 달"
        >
          <Ionicons
            name="caret-back"
            size={normalize(14)}
            color={canPrev ? colors.text : colors.textLight2}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.grassMonthBtn}
          onPress={() => setPickerVisible(true)}
          accessibilityLabel="연월 선택"
        >
          <Text style={styles.grassMonthLabel}>
            {view.year}년 {view.month + 1}월
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.grassNavBtn}
          onPress={() => shiftMonth(1)}
          disabled={!canNext}
          accessibilityLabel="다음 달"
        >
          <Ionicons
            name="caret-forward"
            size={normalize(14)}
            color={canNext ? colors.text : colors.textLight2}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.grassWeekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
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
      {loading
        ? Array.from({ length: 5 }, (_, row) => (
            <View key={`grass-skel-${row}`} style={styles.grassWeekRow}>
              {Array.from({ length: 7 }, (_, col) => (
                <View key={`grass-skel-${row}-${col}`} style={styles.grassDayCell}>
                  <Skeleton
                    width={normalize(28)}
                    height={normalize(36)}
                    borderRadius={normalize(8)}
                  />
                </View>
              ))}
            </View>
          ))
        : weeks.map((week) => (
        <View key={week[0].dayKey} style={styles.grassWeekRow}>
          {week.map((cell, index) => {
            const seconds = cell.inMonth ? secondsByDay[cell.dayKey] : undefined;
            const bg = getGrassColor(seconds);
            const duration = formatGrassDuration(seconds);
            const isSunday = index === 0;
            const isSaturday = index === 6;
            return (
              <TouchableOpacity
                key={cell.dayKey}
                activeOpacity={0.7}
                disabled={!canPressCell(cell)}
                onPress={() => handleCellPress(cell)}
                style={[
                  styles.grassDayCell,
                  bg && { backgroundColor: bg },
                ]}
              >
                <View style={cell.dayKey === todayKey ? styles.grassTodayBadge : null}>
                  <Text
                    style={[
                      styles.grassDayText,
                      cell.dayKey === todayKey && styles.grassTodayText,
                      !cell.inMonth && styles.grassDayTextOutside,
                      isSunday && cell.dayKey !== todayKey && styles.weekCalSunday,
                      isSaturday && cell.dayKey !== todayKey && styles.weekCalSaturday,
                      !cell.inMonth && isSunday && styles.weekCalSundayMuted,
                      !cell.inMonth && isSaturday && styles.weekCalSaturdayMuted,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                {duration ? (
                  <Text
                    style={styles.grassDurationText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {duration}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={styles.grassFooter}>
        {loading ? (
          <>
            <Skeleton width={normalize(92)} height={normalize(16)} borderRadius={normalize(6)} />
            <Skeleton width={normalize(120)} height={normalize(16)} borderRadius={normalize(6)} />
          </>
        ) : (
          <>
            <Text style={styles.grassMonthTotal}>{monthTotalLabel}</Text>
            <View style={styles.grassLegend}>
              {GRASS_LEGEND.map((level) => (
                <View
                  key={level.label}
                  style={[styles.grassLegendChip, { backgroundColor: level.color }]}
                >
                  <Text style={styles.grassLegendText}>{level.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
      <TimerYearMonthPicker
        visible={pickerVisible}
        value={view}
        min={minMonth}
        max={maxMonth}
        onConfirm={setView}
        onClose={() => setPickerVisible(false)}
        styles={styles}
        normalize={normalize}
      />
    </View>
  );
}
