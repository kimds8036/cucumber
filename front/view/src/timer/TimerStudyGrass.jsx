/**
 * 타이머 플래너 — 공부 잔디 (한 달 달력 + 날짜별 공부 시간)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import { getTimerDayKey } from '../../../utils/timerStorage';
import TimerYearMonthPicker from './TimerYearMonthPicker';
import { fetchStudyGrassMonth } from './studyGrassDummy';
import {
  getGrassColor,
  formatGrassDuration,
  GRASS_LEGEND,
  GRASS_FALLBACK_MIN_YEAR_MONTH,
} from './studyGrassHelpers';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const pad2 = (n) => String(n).padStart(2, '0');
const toDayKey = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;
const toMonthIndex = ({ year, month }) => year * 12 + month;

function parseDayKey(dayKey) {
  const [y, m] = dayKey.split('-').map(Number);
  return { year: y, month: m - 1 };
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

export default function TimerStudyGrass({ styles, normalize, onOpenDayRecord }) {
  const todayKey = getTimerDayKey(new Date());
  const maxMonth = parseDayKey(todayKey);
  const minMonth = GRASS_FALLBACK_MIN_YEAR_MONTH;
  const [view, setView] = useState(() => parseDayKey(todayKey));
  const [secondsByDay, setSecondsByDay] = useState({});
  const [pickerVisible, setPickerVisible] = useState(false);

  const viewIdx = toMonthIndex(view);
  const canPrev = viewIdx > toMonthIndex(minMonth);
  const canNext = viewIdx < toMonthIndex(maxMonth);
  const shiftMonth = (delta) => {
    const next = viewIdx + delta;
    setView({ year: Math.floor(next / 12), month: next % 12 });
  };

  useEffect(() => {
    let alive = true;
    setSecondsByDay({});
    fetchStudyGrassMonth(view.year, view.month).then((data) => {
      if (alive) setSecondsByDay(data || {});
    });
    return () => {
      alive = false;
    };
  }, [view.year, view.month]);

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
          onPress={() => shiftMonth(-1)}
          disabled={!canPrev}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="이전 달"
        >
          <Ionicons
            name="caret-back"
            size={normalize(14)}
            color={canPrev ? colors.text : colors.textLight2}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityLabel="연월 선택"
        >
          <Text style={styles.grassMonthLabel}>
            {view.year}년 {view.month + 1}월
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          disabled={!canNext}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.grassWeekdayText}>
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].dayKey} style={styles.grassWeekRow}>
          {week.map((cell) => {
            const seconds = cell.inMonth ? secondsByDay[cell.dayKey] : undefined;
            const bg = getGrassColor(seconds);
            const duration = formatGrassDuration(seconds);
            return (
              <TouchableOpacity
                key={cell.dayKey}
                activeOpacity={0.7}
                disabled={!canPressCell(cell)}
                onPress={() => handleCellPress(cell)}
                style={[
                  styles.grassDayCell,
                  bg && { backgroundColor: bg },
                  cell.dayKey === todayKey && styles.grassDayCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.grassDayText,
                    !cell.inMonth && styles.grassDayTextOutside,
                  ]}
                >
                  {cell.day}
                </Text>
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
