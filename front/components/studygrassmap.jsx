import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../styles/colors';
import { getNormalize } from '../styles/frame.style';

// ── 잔디 그라데이션 색상 (colors.js 기반) ─────────────────────────────────────
const GRASS_COLORS = [
  colors.primaryLight30,
  colors.primaryLight50,
  'rgba(166,218,149,0.7)',
  colors.primary,
  '#6DBF52',
  '#4F9837',
  colors.primaryDark,
];
const EMPTY_COLOR = '#ebedf0';
const LEGEND_LABELS = ['없음', '0.5h', '1h', '2h', '3h', '4h', '5h', '5h+'];

function getLevelFromHours(hoursValue) {
  const hours = Number(hoursValue);
  if (!Number.isFinite(hours) || hours < 0.5) return null;
  if (hours < 1.0) return 0;
  if (hours < 2.0) return 1;
  if (hours < 3.0) return 2;
  if (hours < 4.0) return 3;
  if (hours < 5.0) return 4;
  if (hours < 6.0) return 5;
  return 6;
}

function hoursToColor(hoursValue) {
  const level = getLevelFromHours(hoursValue);
  return level == null ? EMPTY_COLOR : GRASS_COLORS[level];
}

function toHours(dayEntry) {
  if (dayEntry == null) return null;
  if (typeof dayEntry === 'number') return dayEntry;
  if (typeof dayEntry !== 'object') return null;
  if (dayEntry.hours != null) return Number(dayEntry.hours);
  if (dayEntry.minutes != null) return Number(dayEntry.minutes) / 60;
  if (dayEntry.totalElapsedMs != null)
    return Number(dayEntry.totalElapsedMs) / 3600000;
  return null;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLastDayOfMonth(year, month1To12) {
  return new Date(year, month1To12, 0).getDate();
}

function getCurrentSemesterRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 8) {
    return {
      startDate: new Date(year, 2, 1),
      endDate: new Date(year, 7, 31),
      label: 'first',
    };
  }
  if (month >= 9) {
    const endDay = getLastDayOfMonth(year + 1, 2);
    return {
      startDate: new Date(year, 8, 1),
      endDate: new Date(year + 1, 1, endDay),
      label: 'second',
    };
  }
  const endDay = getLastDayOfMonth(year, 2);
  return {
    startDate: new Date(year - 1, 8, 1),
    endDate: new Date(year, 1, endDay),
    label: 'second',
  };
}

function buildWeekColumns(days, weekCountOverride = null) {
  const safeDays = Array.isArray(days) ? days : [];
  const byDayKey = new Map();
  safeDays.forEach((entry) => {
    const key = typeof entry?.dayKey === 'string' ? entry.dayKey : null;
    if (!key) return;
    byDayKey.set(key, toHours(entry));
  });

  const { startDate, endDate } = getCurrentSemesterRange(new Date());
  const semesterStart = new Date(startDate);
  semesterStart.setHours(0, 0, 0, 0);
  const semesterEnd = new Date(endDate);
  semesterEnd.setHours(0, 0, 0, 0);
  const firstWeekStart = new Date(semesterStart);
  firstWeekStart.setDate(semesterStart.getDate() - semesterStart.getDay());
  const lastWeekEnd = new Date(semesterEnd);
  lastWeekEnd.setDate(semesterEnd.getDate() + (6 - semesterEnd.getDay()));
  const totalDays =
    Math.floor((lastWeekEnd.getTime() - firstWeekStart.getTime()) / 86400000) +
    1;
  const calculatedWeeks = Math.ceil(totalDays / 7);
  const weekCount =
    weekCountOverride && weekCountOverride > 0
      ? Math.floor(weekCountOverride)
      : calculatedWeeks;

  const result = [];
  const monthLabels = [];
  const seenMonths = new Set();

  for (let w = 0; w < weekCount; w += 1) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + w * 7);
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(weekStart.getDate() + d);
      const key = toDateKey(cellDate);
      const isInSemester = cellDate >= semesterStart && cellDate <= semesterEnd;
      if (!isInSemester) {
        week.push(null);
        continue;
      }
      if (byDayKey.size > 0) {
        week.push(byDayKey.has(key) ? byDayKey.get(key) : null);
      } else {
        week.push(null);
      }
    }
    result.push(week);

    const monthKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}`;
    if (weekStart.getDate() <= 7 && !seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      monthLabels.push({
        label: `${weekStart.getMonth() + 1}월`,
        weekIndex: w,
      });
    }
  }

  // dayKey가 없는 구형 응답은 기존 인덱스 순서로 fallback
  if (byDayKey.size === 0 && safeDays.length > 0) {
    const fallback = Array(weekCount * 7).fill(null);
    for (let i = 0; i < Math.min(safeDays.length, fallback.length); i += 1) {
      fallback[i] = toHours(safeDays[i]);
    }
    for (let w = 0; w < weekCount; w += 1) {
      result[w] = fallback.slice(w * 7, w * 7 + 7);
    }
  }

  return {
    weekColumns: result,
    monthLabels,
    weeks: weekCount,
    semesterStartKey: toDateKey(semesterStart),
    semesterEndKey: toDateKey(semesterEnd),
  };
}

function renderLegendColors() {
  return [EMPTY_COLOR, ...GRASS_COLORS];
}

export { getLevelFromHours, hoursToColor, toHours };

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKS = 27;

const StudyGrassMap = ({ days = null, weeks = WEEKS }) => {
  const safeWeeksProp =
    Number.isFinite(weeks) && weeks > 0 ? Math.floor(weeks) : WEEKS;
  const {
    weekColumns,
    monthLabels,
    weeks: derivedWeeks,
    semesterStartKey,
    semesterEndKey,
  } = useMemo(() => buildWeekColumns(days, safeWeeksProp), [days, weeks]);
  const safeWeeks = derivedWeeks || safeWeeksProp;
  const legendColors = useMemo(() => renderLegendColors(), []);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[StudyGrass] semester range applied', {
      semesterStartKey,
      semesterEndKey,
      weeks: safeWeeks,
      points: Array.isArray(days) ? days.length : 0,
    });
  }, [semesterStartKey, semesterEndKey, safeWeeks, days]);

  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  const layout = useMemo(() => {
    const CONTAINER_PADDING = normalize(30);
    const DAY_COL_W = normalize(16);
    const GAP = normalize(1.5);
    const AVAILABLE_WIDTH = width - CONTAINER_PADDING * 2 - DAY_COL_W;
    const CELL = (AVAILABLE_WIDTH - safeWeeks * GAP) / safeWeeks;
    const STEP = CELL + GAP;
    const MONTH_H = normalize(14);
    const gridWidth = safeWeeks * STEP - GAP;
    const dayLabelsHeight = 7 * STEP - GAP;
    return {
      DAY_COL_W,
      GAP,
      CELL,
      STEP,
      MONTH_H,
      gridWidth,
      dayLabelsHeight,
    };
  }, [width, normalize, safeWeeks]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          marginTop: normalize(0),
          marginBottom: normalize(4),
        },
        divider: {
          height: normalize(1),
          backgroundColor: colors.textLight10,
          marginVertical: normalize(16),
        },
        sectionTitle: {
          fontSize: normalize(13),
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: normalize(6),
        },
        body: {
          width: '100%',
        },
        grassBlock: {
          width: '100%',
        },
        monthRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          height: layout.MONTH_H,
          marginBottom: normalize(3),
        },
        monthInner: {
          position: 'relative',
          height: layout.MONTH_H,
        },
        monthLabel: {
          position: 'absolute',
          top: 0,
          fontSize: normalize(9),
          color: colors.textSecondary,
        },
        grassWrapper: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        },
        grassInner: {
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'flex-start',
          alignSelf: 'center',
        },
        dayLabels: {
          position: 'absolute',
          left: -layout.DAY_COL_W,
          top: 0,
          width: layout.DAY_COL_W,
          justifyContent: 'space-between',
          marginRight: 0,
          height: layout.dayLabelsHeight,
        },
        dayLabel: {
          width: layout.DAY_COL_W,
          fontSize: normalize(8),
          color: colors.textSecondary,
          height: layout.STEP,
          lineHeight: layout.STEP,
          textAlign: 'right',
          paddingRight: normalize(3),
        },
        weeksRow: {
          flexDirection: 'row',
          gap: layout.GAP,
        },
        weekCol: {
          flexDirection: 'column',
          gap: layout.GAP,
        },
        cell: {
          width: layout.CELL,
          height: layout.CELL,
          borderRadius: normalize(2),
        },
        legend: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: normalize(6),
          marginTop: normalize(8),
          marginRight: normalize(18),
        },
        legendItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: normalize(3),
        },
        legendCell: {
          width: normalize(9),
          height: normalize(9),
          borderRadius: normalize(2),
        },
        legendText: {
          fontSize: normalize(8),
          color: colors.textSecondary,
        },
      }),
    [normalize, layout],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.body}>
        <View style={styles.grassBlock}>
          <View style={styles.monthRow}>
            <View style={[styles.monthInner, { width: layout.gridWidth }]}>
              {monthLabels.map((m) => (
                <Text
                  key={m.label}
                  style={[
                    styles.monthLabel,
                    { left: m.weekIndex * layout.STEP },
                  ]}
                >
                  {m.label}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.grassWrapper}>
            <View style={[styles.grassInner, { width: layout.gridWidth }]}>
              <View style={styles.dayLabels}>
                {DAY_LABELS.map((d) => (
                  <Text key={d} style={styles.dayLabel}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={styles.weeksRow}>
                {weekColumns.map((week, wi) => (
                  <View key={wi} style={styles.weekCol}>
                    {week.map((hours, di) => (
                      <View
                        key={di}
                        style={[
                          styles.cell,
                          { backgroundColor: hoursToColor(hours) },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.legend}>
          {legendColors.map((color, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendCell, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{LEGEND_LABELS[i]}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default StudyGrassMap;
