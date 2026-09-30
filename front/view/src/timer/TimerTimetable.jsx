/**
 * 타이머 플래너 — 타임테이블 (06시~05시, 10분 칸, 과목 색으로 공부 구간 표시)
 */
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../styles/colors';
import { GuideFocusTarget } from '../../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../../src/screens/UserGuide/guideFocusTargets';
import {
  HOURS,
  tdb,
  getSecondsFromSixAM,
  toTimerDayTimelineSeconds,
  appendSessionSegmentsForSlot,
} from './timerHelpers';

export default function TimerTimetable({
  styles,
  displaySessions,
  displaySubjects,
}) {
  const getSlotSegments = (slotStartSeconds) => {
    const slotStart = toTimerDayTimelineSeconds(slotStartSeconds);
    const slotEnd = slotStart + 600;
    const nowSec = getSecondsFromSixAM(new Date());
    const segments = [];
    displaySessions.forEach((s) => {
      appendSessionSegmentsForSlot(
        segments,
        s,
        slotStart,
        slotEnd,
        nowSec,
        displaySubjects,
      );
    });
    segments.sort((a, b) => a.startFraction - b.startFraction);
    return segments;
  };

  return (
    <GuideFocusTarget
      name={T.TIMER_TIMETABLE_COLUMN}
      style={[styles.timetableColumn, tdb('#4682B4')]}
    >
      <View style={[styles.timetableContainer, tdb('#CD853F')]}>
        {HOURS.map((rowIndex) => {
          const hour = (6 + rowIndex) % 24;
          const slotStartBaseSeconds = ((hour - 6 + 24) % 24) * 3600;
          return (
            <View
              key={rowIndex}
              style={[
                styles.timetableRow,
                rowIndex === 0 && styles.timetableRowFirst,
                tdb('#708090'),
              ]}
            >
              <View style={[styles.timetableHourCell, tdb('#B8860B')]}>
                <Text style={styles.timetableHourText}>
                  {hour.toString().padStart(2, '0')}
                </Text>
              </View>
              <View style={[styles.timetableSlotsRow, tdb('#556B2F')]}>
                {[0, 10, 20, 30, 40, 50].map((m) => {
                  const slotStartSeconds = slotStartBaseSeconds + m * 60;
                  const segments = getSlotSegments(slotStartSeconds);
                  let pos = 0;
                  return (
                    <View
                      key={m}
                      style={[styles.timetableSlotCell, tdb('#8B4513')]}
                    >
                      {segments.map((seg, idx) => {
                        const spacerFlex = Math.max(0, seg.startFraction - pos);
                        pos = seg.startFraction + seg.widthFraction;
                        return (
                          <React.Fragment key={idx}>
                            {spacerFlex > 0 && (
                              <View
                                style={[
                                  styles.timetableSlotSegment,
                                  {
                                    flex: spacerFlex,
                                    backgroundColor: colors.white,
                                  },
                                ]}
                              />
                            )}
                            <View
                              style={[
                                styles.timetableSlotSegment,
                                {
                                  backgroundColor: seg.color,
                                  flex: seg.widthFraction,
                                },
                              ]}
                            />
                          </React.Fragment>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </GuideFocusTarget>
  );
}
