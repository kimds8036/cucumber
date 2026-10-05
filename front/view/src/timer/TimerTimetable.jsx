/**
 * 타이머 플래너 — 타임테이블 (06시~05시, 10분 칸)
 * 격자는 그대로 두고, 학교 시간은 격자 뒤에 absolute로 깐다.
 * 공부 색은 10분 칸 안에서 칸 높이에 맞춰 채운다.
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

function StudySlotFill({ segments, styles }) {
  if (!segments?.length) return null;
  const sorted = [...segments].sort(
    (a, b) => a.startFraction - b.startFraction,
  );
  let pos = 0;
  const pieces = [];
  sorted.forEach((seg, index) => {
    const spacerFlex = Math.max(0, seg.startFraction - pos);
    pos = seg.startFraction + seg.widthFraction;
    if (spacerFlex > 0) {
      pieces.push(
        <View
          key={`gap-${index}`}
          style={[styles.timetableSlotSegment, { flex: spacerFlex }]}
        />,
      );
    }
    if (seg.widthFraction > 0) {
      pieces.push(
        <View
          key={`color-${index}`}
          style={[
            styles.timetableSlotSegment,
            { flex: seg.widthFraction, backgroundColor: seg.color },
          ]}
        />,
      );
    }
  });
  const trailing = Math.max(0, 1 - pos);
  if (trailing > 0) {
    pieces.push(
      <View
        key="tail"
        style={[styles.timetableSlotSegment, { flex: trailing }]}
      />,
    );
  }
  return pieces;
}

function TimetableHourRow({
  rowIndex,
  hour,
  joinSchool,
  studySlots,
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
          onSlotsLayout(rowIndex, {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
          });
        }}
      >
        {[0, 10, 20, 30, 40, 50].map((minute, slotIndex) => (
          <View
            key={minute}
            style={[styles.timetableSlotCell, tdb('#8B4513')]}
          >
            <StudySlotFill
              segments={studySlots?.[slotIndex]}
              styles={styles}
            />
          </View>
        ))}
      </View>
    </View>
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

  const onSlotsLayout = useCallback((_rowIndex, frame) => {
    setSlotsFrame((prev) =>
      prev && prev.x === frame.x && prev.width === frame.width ? prev : frame,
    );
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

  const studyByRow = useMemo(() => {
    const byRow = {};
    hourRows.forEach((row) => {
      byRow[row.rowIndex] = [0, 10, 20, 30, 40, 50].map((minute) => {
        const slotStart = toTimerDayTimelineSeconds(
          row.slotStartBaseSeconds + minute * 60,
        );
        const segments = [];
        displaySessions.forEach((session) => {
          appendSessionSegmentsForSlot(
            segments,
            session,
            slotStart,
            slotStart + 600,
            nowSec,
            displaySubjects,
          );
        });
        return segments;
      });
    });
    return byRow;
  }, [displaySessions, displaySubjects, hourRows, nowSec]);

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
        {hourRows.map((row) => (
          <TimetableHourRow
            key={row.rowIndex}
            rowIndex={row.rowIndex}
            hour={row.hour}
            studySlots={studyByRow[row.rowIndex]}
            joinSchool={
              hourTouchesSchool(schoolSpan, row.rowIndex) &&
              hourTouchesSchool(schoolSpan, row.rowIndex - 1)
            }
            onRowLayout={onRowLayout}
            onSlotsLayout={onSlotsLayout}
            styles={styles}
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
