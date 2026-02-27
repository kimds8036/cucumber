import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ── 색상 ──────────────────────────────────────────────
const GRASS_COLORS = [
  '#EBEDF0',
  '#D6F0C2',
  '#A8D97F',
  '#7BC96F',
  '#4DB36A',
  '#2D9E55',
  '#1E7A40',
  '#145C2E',
];
const LEGEND_LABELS = ['없음', '0.5h', '1h', '2h', '3h', '4h', '5h', '5h+'];

const densityToLevel = (d) => {
  if (d <= 0)  return 0;
  if (d < 0.5) return 1;
  if (d < 1.0) return 2;
  if (d < 2.0) return 3;
  if (d < 3.0) return 4;
  if (d < 4.0) return 5;
  if (d < 5.0) return 6;
  return 7;
};
const densityToColor = (d) => GRASS_COLORS[densityToLevel(d)];

// ── 레이아웃 상수 ─────────────────────────────────────
// 한 화면에 27주가 모두 들어오도록 셀 크기를 살짝 작게 조정
const CELL          = 8;    // 셀 크기 (px)
const GAP           = 1.5;  // 셀 간격
const STEP          = CELL + GAP;
const DAY_COL_W     = 16;   // 요일 레이블 고정 너비
const MONTH_H       = 14;   // 월 레이블 행 높이

// ── 데이터 상수 ───────────────────────────────────────
const WEEKS = 27;  // 3월~8월 ≈ 27주
const DAYS  = WEEKS * 7;

// 월별 시작 주(0-based) — 3월 1주=0, 4월≈4.4주, …
// 3월:0, 4월:4.4, 5월:8.9, 6월:13.1, 7월:17.6, 8월:22.0 (평균값으로 고정)
const MONTH_WEEK_OFFSETS = [
  { label: '3월', weekOffset: 0   },
  { label: '4월', weekOffset: 4.4 },
  { label: '5월', weekOffset: 8.9 },
  { label: '6월', weekOffset: 13.1},
  { label: '7월', weekOffset: 17.6},
  { label: '8월', weekOffset: 22.0},
];

// ── 더미 데이터 ───────────────────────────────────────
const calcDensity = (students) => {
  const N   = students.length;
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

  const start     = new Date(2025, 2, 1); // 2025-03-01
  const dailyData = [];

  for (let i = 0; i < DAYS; i++) {
    const date      = new Date(start);
    date.setDate(start.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isExam    = (i >= 45 && i < 55) || (i >= 122 && i < 132);
    const isVacation= i >= 105 && i < 180;

    const wf = isWeekend   ? 0.4  : 1.0;
    const ef = isExam      ? 1.6  : 1.0;
    const vf = isVacation  ? 0.55 : 1.0;

    const ds = students.map((s) => ({
      ...s,
      studyTime: Math.max(
        0,
        s.studyTime * wf * ef * vf * (0.55 + Math.random() * 0.9)
      ),
    }));

    dailyData.push({ date, density: calcDensity(ds) });
  }
  return dailyData;
};

// ── 요일 레이블 ───────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ── 컴포넌트 ─────────────────────────────────────────
const StudyGrassMap = () => {
  const dailyData = useMemo(() => generateDummyData(), []);

  const weeks = useMemo(() => {
    const result = [];
    for (let w = 0; w < WEEKS; w++) {
      result.push(dailyData.slice(w * 7, w * 7 + 7));
    }
    return result;
  }, [dailyData]);

  // 잔디 그리드 총 너비
  const gridWidth = WEEKS * STEP - GAP;
  const grassInnerWidth = gridWidth;

  return (
    <View style={styles.wrapper}>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>공부 잔디</Text>

      <View style={styles.body}>
        {/* ── 잔디 블록: 픽셀(그리드) 부분만 x·y 가운데 정렬 ── */}
        <View style={styles.grassBlock}>
          {/* ── 월 레이블 행 (그리드와 맞추어 가운데) ── */}
          <View style={styles.monthRow}>
            <View style={[styles.monthInner, { width: gridWidth }]}>
              {MONTH_WEEK_OFFSETS.map((m) => (
                <Text
                  key={m.label}
                  style={[styles.monthLabel, { left: m.weekOffset * STEP }]}
                >
                  {m.label}
                </Text>
              ))}
            </View>
          </View>

          {/* ── 요일 + 잔디 픽셀 (그리드 전체를 가운데 정렬) ── */}
          <View style={styles.grassWrapper}>
            <View style={[styles.grassInner, { width: grassInnerWidth }]}>
              <View style={styles.dayLabels}>
                {DAY_LABELS.map((d) => (
                  <Text key={d} style={styles.dayLabel}>{d}</Text>
                ))}
              </View>

              <View style={styles.weeksRow}>
                {weeks.map((week, wi) => (
                  <View key={wi} style={styles.weekCol}>
                    {week.map((day, di) => (
                      <View
                        key={di}
                        style={[styles.cell, { backgroundColor: densityToColor(day.density) }]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── 범례 (우측 정렬 고정) ── */}
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

// ── 스타일 ────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  body: {
    width: '100%',
  },
  grassBlock: {
    width: '100%',
  },
  // 월 레이블 (그리드와 맞춰 가운데)
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: MONTH_H,
    marginBottom: 3,
  },
  monthInner: {
    position: 'relative',
    height: MONTH_H,
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    fontSize: 9,
    color: '#888',
  },
  // 잔디 픽셀 영역: x·y 가운데 정렬
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
  // 월 레이블 (중복 제거용 주석)
  dayLabels: {
    position: 'absolute',
    left: -DAY_COL_W,
    top: 0,
    width: DAY_COL_W,
    justifyContent: 'space-between',
    marginRight: 0,
    height: DAYS / WEEKS * STEP - GAP, // 7 * STEP - GAP
  },
  dayLabel: {
    width: DAY_COL_W,
    fontSize: 8,
    color: '#bbb',
    height: STEP,
    lineHeight: STEP,
    textAlign: 'right',
    paddingRight: 3,
  },
  weeksRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  weekCol: {
    flexDirection: 'column',
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
  // 범례
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendCell: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 8,
    color: '#aaa',
  },
});

export default StudyGrassMap;