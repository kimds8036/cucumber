/**
 * 타이머 플래너 — 타임테이블 (06시~05시, 10분 칸)
 * 격자는 그대로 두고, 학교 시간은 그 위에 absolute 직사각형으로 덮는다.
 * 시작·종료 시각을 시 줄의 픽셀 위치로 바꿔 top / height 에 둔다.
 * 공부 색은 학교 레이어 위에 올라간다.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../../utils/api';
import { colors } from '../../../styles/colors';
import { getNormalize } from '../../../styles/timer';
import { subscribeSchoolCheckIn } from '../../../utils/schoolPeriodsBus';
import { GuideFocusTarget } from '../../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../../src/screens/UserGuide/guideFocusTargets';
import {
  HOURS,
  tdb,
  SCHOOL_TIMETABLE_BG,
  SCHOOL_TIMETABLE_HINT,
  getSecondsFromSixAM,
  toTimerDayTimelineSeconds,
  appendSessionSegmentsForSlot,
  schoolTimelineSpan,
} from './timerHelpers';

function barBox(bar, rowWidth) {
  const left = Math.round(bar.startFraction * rowWidth);
  const endFraction = bar.startFraction + bar.widthFraction;
  const right =
    endFraction >= 0.999 ? rowWidth : Math.round(endFraction * rowWidth);
  if (right <= left) return null;
  return {
    left,
    width: right - left,
    color: bar.color,
  };
}

function TimetableHourRow({
  rowIndex,
  hour,
  joinSchool,
  onRowLayout,
  onSlotsLayout,
  styles,
}) {
  return (
    <View
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        onRowLayout(rowIndex, y, height);
      }}
      style={[
        styles.timetableRow,
        rowIndex === 0 && styles.timetableRowFirst,
        joinSchool && styles.timetableRowSchoolJoin,
        tdb('#708090'),
      ]}
    >
      <View
        style={[
          styles.timetableHourCell,
          joinSchool && styles.timetableHourCellGrid,
          tdb('#B8860B'),
        ]}
      >
        <Text style={styles.timetableHourText}>
          {hour.toString().padStart(2, '0')}
        </Text>
      </View>
      <View
        style={[styles.timetableSlotsRow, tdb('#556B2F')]}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          onSlotsLayout({
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
          });
        }}
      >
        {[0, 10, 20, 30, 40, 50].map((minute) => (
          <View
            key={minute}
            style={[styles.timetableSlotCell, tdb('#8B4513')]}
          />
        ))}
      </View>
    </View>
  );
}

function sameFrame(prev, next) {
  return (
    prev &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.width === next.width &&
    prev.height === next.height
  );
}

/** 슬롯 왼쪽 세로선은 학교 색 밖에 남긴다. */
function keepLeftGrid(left, width, slotsX) {
  if (left > slotsX) return { left, width };
  return { left: left + 1, width: Math.max(0, width - 1) };
}

/** 학교 구간을 격자 위 사각형으로 바꾼다. 꽉 찬 시는 하나로 이어 top/height 에 둔다. */
function schoolOverlayRects(span, rowLayouts, slots) {
  if (!span || !slots?.width) return [];
  const rects = [];
  let block = null;

  const flushBlock = () => {
    if (!block) return;
    rects.push(block);
    block = null;
  };

  for (let hourIndex = 0; hourIndex < 24; hourIndex += 1) {
    const row = rowLayouts[hourIndex];
    if (!row) continue;
    const hourStart = hourIndex * 3600;
    const hourEnd = hourStart + 3600;
    const overlapStart = Math.max(hourStart, span.start);
    const overlapEnd = Math.min(hourEnd, span.end);
    if (overlapEnd <= overlapStart) {
      flushBlock();
      continue;
    }
    const top = row.y;
    const full = overlapStart <= hourStart && overlapEnd >= hourEnd;
    if (full) {
      if (!block) {
        const edged = keepLeftGrid(slots.x, slots.width, slots.x);
        block = {
          key: `block-${hourIndex}`,
          top,
          height: row.height,
          left: edged.left,
          width: edged.width,
        };
      } else {
        block.height = top + row.height - block.top;
      }
      continue;
    }
    flushBlock();
    const startFraction = (overlapStart - hourStart) / 3600;
    const widthFraction = (overlapEnd - overlapStart) / 3600;
    const rawLeft = Math.round(slots.x + startFraction * slots.width);
    const right = Math.round(slots.x + (startFraction + widthFraction) * slots.width);
    const edged = keepLeftGrid(rawLeft, right - rawLeft, slots.x);
    if (edged.width <= 0) continue;
    rects.push({
      key: `scrap-${hourIndex}`,
      top,
      height: row.height,
      left: edged.left,
      width: edged.width,
    });
  }
  flushBlock();
  // 자투리와 블록이 맞닿은 가로 경계선이 비치지 않게 1px 겹친다.
  rects.forEach((rect, index) => {
    const next = rects[index + 1];
    if (!next) return;
    if (rect.top + rect.height < next.top - 1) return;
    rect.height += 1;
    next.top -= 1;
    next.height += 1;
  });
  return rects;
}

function hourTouchesSchool(span, hourIndex) {
  if (!span) return false;
  const hourStart = hourIndex * 3600;
  const hourEnd = hourStart + 3600;
  return Math.min(hourEnd, span.end) > Math.max(hourStart, span.start);
}

export default function TimerTimetable({
  styles,
  displaySessions,
  displaySubjects,
  dayKey = null,
  guideTarget = true,
  showHint = true,
}) {
  const Wrap = guideTarget ? GuideFocusTarget : View;
  const { width } = useWindowDimensions();
  const normalize = getNormalize(width);
  const [schoolPeriods, setSchoolPeriods] = useState([]);
  const [rowLayouts, setRowLayouts] = useState({});
  const [slotsFrame, setSlotsFrame] = useState(null);

  const loadSchoolPeriods = useCallback(async () => {
    if (!dayKey) return [];
    try {
      const res = await api.get('/api/timer/day', { params: { dayKey } });
      const periods = res.data?.data?.schoolPeriods;
      return Array.isArray(periods) ? periods : [];
    } catch {
      return [];
    }
  }, [dayKey]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadSchoolPeriods().then((periods) => {
        if (!cancelled) setSchoolPeriods(periods);
      });
      return () => {
        cancelled = true;
      };
    }, [loadSchoolPeriods]),
  );

  useEffect(
    () =>
      subscribeSchoolCheckIn(() => {
        loadSchoolPeriods().then(setSchoolPeriods);
      }),
    [loadSchoolPeriods],
  );

  const onRowLayout = useCallback((rowIndex, y, height) => {
    setRowLayouts((prev) => {
      const current = prev[rowIndex];
      if (current && current.y === y && current.height === height) return prev;
      return { ...prev, [rowIndex]: { y, height } };
    });
  }, []);

  const onSlotsLayout = useCallback((frame) => {
    setSlotsFrame((prev) => (sameFrame(prev, frame) ? prev : frame));
  }, []);

  const schoolSpan = useMemo(
    () => schoolTimelineSpan(schoolPeriods),
    [schoolPeriods],
  );

  const hourRows = useMemo(
    () =>
      HOURS.map((rowIndex) => {
        const hour = (6 + rowIndex) % 24;
        const slotStartBaseSeconds = ((hour - 6 + 24) % 24) * 3600;
        return { rowIndex, hour, slotStartBaseSeconds };
      }),
    [],
  );

  const schoolRects = useMemo(
    () => schoolOverlayRects(schoolSpan, rowLayouts, slotsFrame),
    [schoolSpan, rowLayouts, slotsFrame],
  );

  const blockRect = schoolRects.find((rect) => rect.key.startsWith('block'));
  const labelRect = blockRect || (schoolRects.length
    ? {
        top: Math.min(...schoolRects.map((rect) => rect.top)),
        height:
          Math.max(...schoolRects.map((rect) => rect.top + rect.height)) -
          Math.min(...schoolRects.map((rect) => rect.top)),
        left: slotsFrame?.x ?? 0,
      }
    : null);

  const nowSec = getSecondsFromSixAM(new Date());

  const studyRects = useMemo(() => {
    if (!slotsFrame?.width) return [];
    const rects = [];
    hourRows.forEach((row) => {
      const layout = rowLayouts[row.rowIndex];
      if (!layout) return;
      [0, 10, 20, 30, 40, 50].forEach((minute) => {
        const slotStartSeconds = row.slotStartBaseSeconds + minute * 60;
        const slotStart = toTimerDayTimelineSeconds(slotStartSeconds);
        const slotEnd = slotStart + 600;
        const slotIndex = minute / 10;
        const segments = [];
        displaySessions.forEach((session) => {
          appendSessionSegmentsForSlot(
            segments,
            session,
            slotStart,
            slotEnd,
            nowSec,
            displaySubjects,
          );
        });
        segments.forEach((seg, index) => {
          const box = barBox(
            {
              startFraction: (slotIndex + seg.startFraction) / 6,
              widthFraction: seg.widthFraction / 6,
            },
            slotsFrame.width,
          );
          if (!box) return;
          const slotTop = layout.y + slotsFrame.y;
          const slotHeight = slotsFrame.height;
          const barHeight = Math.max(1, slotHeight - 4);
          const top = Math.round(slotTop + (slotHeight - barHeight) / 2);
          const edged = keepLeftGrid(
            slotsFrame.x + box.left,
            box.width,
            slotsFrame.x,
          );
          if (edged.width <= 0) return;
          rects.push({
            key: `${row.rowIndex}-${minute}-${index}`,
            top,
            height: barHeight,
            left: edged.left,
            width: edged.width,
            color: seg.color,
          });
        });
      });
    });
    return rects;
  }, [
    displaySessions,
    displaySubjects,
    hourRows,
    nowSec,
    rowLayouts,
    slotsFrame,
  ]);

  return (
    <Wrap
      name={T.TIMER_TIMETABLE_COLUMN}
      style={[styles.timetableColumn, tdb('#4682B4')]}
    >
      {showHint ? (
        <View style={styles.timetableSchoolHint}>
          <Ionicons
            name="information-circle-outline"
            size={normalize(14)}
            color={colors.textLight5}
          />
          <Text
            style={styles.timetableSchoolHintText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {SCHOOL_TIMETABLE_HINT}
          </Text>
        </View>
      ) : null}
      <View style={[styles.timetableContainer, tdb('#CD853F')]}>
        {hourRows.map((row) => (
          <TimetableHourRow
            key={row.rowIndex}
            rowIndex={row.rowIndex}
            hour={row.hour}
            joinSchool={
              hourTouchesSchool(schoolSpan, row.rowIndex) &&
              hourTouchesSchool(schoolSpan, row.rowIndex - 1)
            }
            onRowLayout={onRowLayout}
            onSlotsLayout={onSlotsLayout}
            styles={styles}
          />
        ))}
        {schoolRects.map((rect) => (
          <View
            key={rect.key}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: rect.top,
              height: rect.height,
              left: rect.left,
              width: rect.width,
              backgroundColor: SCHOOL_TIMETABLE_BG,
            }}
          />
        ))}
        {studyRects.map((rect) => (
          <View
            key={rect.key}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: rect.top,
              height: rect.height,
              left: rect.left,
              width: rect.width,
              backgroundColor: rect.color,
            }}
          />
        ))}
        {labelRect && slotsFrame ? (
          <View
            pointerEvents="none"
            style={[
              styles.timetableSchoolBadge,
              {
                top: labelRect.top,
                height: labelRect.height,
                left: slotsFrame.x,
              },
            ]}
          >
            <View style={styles.timetableSchoolBadgePill}>
              <Text style={styles.timetableSchoolBadgeText}>🏫 학교</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Wrap>
  );
}
