import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../styles/colors';
import { getNormalize } from '../styles/frame.style';

// ── 잔디 그라데이션 색상 (colors.js 기반) ─────────────────────────────────────
const GRASS_COLORS = [
  colors.textLight10,
  colors.primaryLight30,
  colors.primaryLight50,
  'rgba(166,218,149,0.7)',
  colors.primary,
  '#6DBF52',
  '#4F9837',
  colors.primaryDark,
];
const LEGEND_LABELS = ['없음', '0.5h', '1h', '2h', '3h', '4h', '5h', '5h+'];

const densityToLevel = (d) => {
  if (d <= 0) return 0;
  if (d < 0.5) return 1;
  if (d < 1.0) return 2;
  if (d < 2.0) return 3;
  if (d < 3.0) return 4;
  if (d < 4.0) return 5;
  if (d < 5.0) return 6;
  return 7;
};
const densityToColor = (d) => GRASS_COLORS[densityToLevel(d)];

// ── 데이터 상수 ───────────────────────────────────────
const WEEKS = 27; // 3월~8월 ≈ 27주
const DAYS = WEEKS * 7;

// 월별 시작 주(0-based)
const MONTH_WEEK_OFFSETS = [
  { label: '3월', weekOffset: 0 },
  { label: '4월', weekOffset: 4.4 },
  { label: '5월', weekOffset: 8.9 },
  { label: '6월', weekOffset: 13.1 },
  { label: '7월', weekOffset: 17.6 },
  { label: '8월', weekOffset: 22.0 },
];

// ── 더미 데이터 ───────────────────────────────────────
const calcDensity = (students) => {
  const N = students.length;
  const sum = students.reduce((acc, s) => acc + s.studyTime * s.focusBonus, 0);
  return sum / N;
};

const generateDummyData = () => {
  const students = [
    { id: 1, studyTime: 5.0, focusBonus: 1.4 },
    { id: 2, studyTime: 4.5, focusBonus: 1.5 },
    { id: 3, studyTime: 3.0, focusBonus: 1.1 },
    { id: 4, studyTime: 1.8, focusBonus: 0.95 },
    { id: 5, studyTime: 0.6, focusBonus: 0.8 },
  ];

  const start = new Date(2025, 2, 1);
  const dailyData = [];

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isExam = (i >= 45 && i < 55) || (i >= 122 && i < 132);
    const isVacation = i >= 105 && i < 180;

    const wf = isWeekend ? 0.4 : 1.0;
    const ef = isExam ? 1.6 : 1.0;
    const vf = isVacation ? 0.55 : 1.0;

    const ds = students.map((s) => ({
      ...s,
      studyTime: Math.max(
        0,
        s.studyTime * wf * ef * vf * (0.55 + Math.random() * 0.9),
      ),
    }));

    dailyData.push({ date, density: calcDensity(ds) });
  }
  return dailyData;
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ── 컴포넌트 ─────────────────────────────────────────
const StudyGrassMap = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  const layout = useMemo(() => {
    const CONTAINER_PADDING = normalize(30);
    const DAY_COL_W = normalize(16);
    const GAP = normalize(1.5);
    const AVAILABLE_WIDTH = width - CONTAINER_PADDING * 2 - DAY_COL_W;
    const CELL = (AVAILABLE_WIDTH - WEEKS * GAP) / WEEKS;
    const STEP = CELL + GAP;
    const MONTH_H = normalize(14);
    const gridWidth = WEEKS * STEP - GAP;
    const dayLabelsHeight = (DAYS / WEEKS) * STEP - GAP;
    return {
      DAY_COL_W,
      GAP,
      CELL,
      STEP,
      MONTH_H,
      gridWidth,
      dayLabelsHeight,
    };
  }, [width, normalize]);

  const dailyData = useMemo(() => generateDummyData(), []);

  const weeks = useMemo(() => {
    const result = [];
    for (let w = 0; w < WEEKS; w++) {
      result.push(dailyData.slice(w * 7, w * 7 + 7));
    }
    return result;
  }, [dailyData]);

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
              {MONTH_WEEK_OFFSETS.map((m) => (
                <Text
                  key={m.label}
                  style={[styles.monthLabel, { left: m.weekOffset * layout.STEP }]}
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
                {weeks.map((week, wi) => (
                  <View key={wi} style={styles.weekCol}>
                    {week.map((day, di) => (
                      <View
                        key={di}
                        style={[
                          styles.cell,
                          { backgroundColor: densityToColor(day.density) },
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
          {GRASS_COLORS.map((color, i) => (
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
