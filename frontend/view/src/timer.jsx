/**
 * timer.jsx
 * - 타이머 + 투두리스트 + 타임테이블 메인 화면 컨테이너
 * - 친구 관련 UI/모달은 timerFriendModals.jsx 에서 import
 * - 모달(UI) 코드는 timerModals.jsx 로, 친구 공부/요청 상태는 FriendContext 로 분리
 */

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useContext,
  createContext,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createTimerStyles, getNormalize } from '../../styles/timer';
import { colors } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MessageTabIcon from '../../assets/Logo.svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { api } from '../../utils/api';
import Skeleton from '../../components/common/Skeleton';
import {
  getTimerDayKey,
  saveDayToDb,
  getPreviousDayKey,
  getNextDayKey,
  loadDayFromDb,
} from '../../utils/timerStorage';
import { AddSubjectModal, AddTaskModal, CalendarModal } from './timerModals';

// ── 친구 관련 (분리된 파일) ─────────────────────────────
// - FriendStoryBar: 상단 친구 스토리/상태 바
// - FriendPokeController / AddFriendModal: 친구 쿡 찌르기 + 친구추가 (토스트는 전역 ToastContext)
import {
  INITIAL_FRIENDS,
  FRIEND_ICON_COLORS,
  FriendStoryBar,
  FriendPokeController,
  AddFriendModal,
} from '../../components/timerFriendModals';
import { useToast } from '../../context/ToastContext';
import { useFriendSocketEvents } from '../../hooks/useFriendSocketEvents';
import { useFriend } from '../../context/FriendContext';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useFriendStudyEvents } from '../../hooks/useFriendStudyEvents';
import {
  cancelTimerRunningNotification,
} from '../../utils/timerRunNotification';
import {
  getTimerRuntimeState,
  registerTimerStopHandler,
  setTimerRuntimeState,
  TIMER_COUNTDOWN_TOTAL_SECONDS,
} from '../../utils/timerRuntimeStore';

// ── 상수 ────────────────────────────────────────────────
// - SUBJECT/TASK/HOURS 등 화면 전체에서 공유하는 기본 값
// - 더미 과목/할일 대신, 처음에는 비어 있고 사용자가 추가하면 저장된다.
const DEFAULT_SUBJECTS = [];
const DEFAULT_TASKS = [];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIMETABLE_GRAY = '#A6DA95';
const TIMER_DAY_START_HOUR = 6;
const TIMER_HEARTBEAT_MS = 60 * 1000;
const TIMER_BACKGROUND_AUTO_CLOSE_MS = 15 * 60 * 1000;
const TIMER_DB_BACKUP_MIN_INTERVAL_MS = 5 * 60 * 1000;
const TIMER_DB_BACKUP_MIN_DELTA_MS = 60 * 1000;
const TIMER_RECOVER_OPEN_SESSION_MAX_SECONDS = 60 * 60;
const TIMER_RUNNING_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
const TIMER_TIMEZONE = 'Asia/Seoul';
const TIMER_SECONDS_PER_DAY = 24 * 60 * 60;
const TIMER_DAY_END_SECONDS = 24 * 60 * 60;
let hasLoggedHour24Debug = false;

// ── 유틸 ─────────────────────────────────────────────────
function getKstDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '00';
  const rawHour = part('hour');
  if (__DEV__ && rawHour === '24' && !hasLoggedHour24Debug) {
    hasLoggedHour24Debug = true;
    console.log('[Timer][Hour24Debug] Intl hour parsed as 24', {
      iso: date.toISOString(),
      timezone: TIMER_TIMEZONE,
      parts,
    });
  }
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
    minute: Number(part('minute')),
    second: Number(part('second')),
  };
}

const getMinutesFromSixAM = (d) => {
  const kst = getKstDateParts(d);
  const secFromSix =
    ((kst.hour * 3600 + kst.minute * 60 + kst.second) - TIMER_DAY_START_HOUR * 3600 + TIMER_SECONDS_PER_DAY) %
    TIMER_SECONDS_PER_DAY;
  return Math.floor(secFromSix / 60);
};
const getSecondsFromSixAM = (d) => {
  const kst = getKstDateParts(d);
  return (
    ((kst.hour * 3600 + kst.minute * 60 + kst.second) -
      TIMER_DAY_START_HOUR * 3600 +
      TIMER_SECONDS_PER_DAY) %
    TIMER_SECONDS_PER_DAY
  );
};

function normalizeClockSeconds(value, fallback = null, { allowDayEnd = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  // 단위 오염 방지: Unix seconds/ms가 들어오면 시각의 "오늘 경과 초"로 보정
  if (n >= 1e12) return getSecondsFromSixAM(new Date(n));
  if (n >= 1e9) return getSecondsFromSixAM(new Date(n * 1000));
  const max = allowDayEnd ? TIMER_DAY_END_SECONDS : TIMER_SECONDS_PER_DAY - 1;
  if (n < 0) {
    return fallback != null
      ? fallback
      : getSecondsFromSixAM(new Date());
  }
  if (n > max) return max;
  return Math.floor(n);
}

function toTimerDayTimelineSeconds(rawSeconds) {
  return normalizeClockSeconds(rawSeconds, 0);
}

function toTimerDayEndAwareSeconds(rawSeconds) {
  return normalizeClockSeconds(rawSeconds, TIMER_DAY_END_SECONDS, {
    allowDayEnd: true,
  });
}

function getSessionDurationMs(session, nowSecRaw = null) {
  const start = toTimerDayTimelineSeconds(session?.startSeconds);
  const endRaw = session?.endSeconds != null ? session.endSeconds : nowSecRaw;
  const end =
    session?.endSeconds != null
      ? toTimerDayEndAwareSeconds(endRaw)
      : toTimerDayTimelineSeconds(endRaw);
  const adjustedEnd = end < start ? end + 86400 : end;
  return Math.max(0, adjustedEnd - start) * 1000;
}

function resolveSessionColor(session, subjects = []) {
  const linkedColor =
    session?.subjectId != null
      ? subjects.find((x) => x.id === session.subjectId)?.color
      : null;
  return linkedColor || session?.subjectColor || TIMETABLE_GRAY;
}

function buildSnapshotCompleteSessions(sessions = [], subjects = []) {
  const subjectMetaMap = new Map(
    (subjects || [])
      .filter((s) => s?.id != null)
      .map((s) => [Number(s.id), { name: s?.name || null, color: s?.color || null }]),
  );
  return (sessions || []).map((session) => {
    const subjectMeta =
      session?.subjectId != null
        ? subjectMetaMap.get(Number(session.subjectId))
        : null;
    return {
      ...session,
      startSeconds: normalizeClockSeconds(session?.startSeconds, 0),
      endSeconds:
        session?.endSeconds == null
          ? null
          : normalizeClockSeconds(session?.endSeconds, null, { allowDayEnd: true }),
      subjectName: session?.subjectName ?? subjectMeta?.name ?? null,
      subjectColor: session?.subjectColor ?? subjectMeta?.color ?? null,
    };
  });
}

function dateFromDayKey(dayKey) {
  return new Date(dayKey + 'T06:00:00');
}

function formatHMS(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function buildSubjectIdHistogram(items = [], key = 'subjectId') {
  const map = {};
  items.forEach((item) => {
    const raw = item?.[key];
    const k = raw == null ? 'null' : String(raw);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function normalizeDayPayload(data) {
  const sessions = Array.isArray(data?.sessions)
    ? data.sessions.map((session) => ({
        ...session,
        startSeconds: normalizeClockSeconds(session?.startSeconds, 0),
        endSeconds:
          session?.endSeconds == null
            ? null
            : normalizeClockSeconds(session?.endSeconds, null, { allowDayEnd: true }),
      }))
    : [];
  return {
    sessions,
    totalElapsedMs: Number(data?.totalElapsedMs) || 0,
    subjects: Array.isArray(data?.subjects) ? data.subjects : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
  };
}

function getPayloadSignature(payload) {
  return JSON.stringify({
    sessions: payload?.sessions ?? [],
    totalElapsedMs: Number(payload?.totalElapsedMs) || 0,
    subjects: payload?.subjects ?? [],
    tasks: payload?.tasks ?? [],
  });
}

/** 1초마다 갱신되는 누적 시간(진행 중 세션) — Provider 하위만 리렌더 */
const LiveElapsedMsContext = createContext(0);

function LiveElapsedTicker({ isRunning, startTimestamp, children }) {
  const [liveExtraMs, setLiveExtraMs] = useState(0);
  useLayoutEffect(() => {
    if (!isRunning || startTimestamp == null) {
      setLiveExtraMs(0);
      return;
    }
    setLiveExtraMs(Date.now() - startTimestamp);
  }, [isRunning, startTimestamp]);
  useEffect(() => {
    if (!isRunning || startTimestamp == null) return undefined;
    const t = setInterval(
      () => setLiveExtraMs(Date.now() - startTimestamp),
      1000,
    );
    return () => clearInterval(t);
  }, [isRunning, startTimestamp]);
  return (
    <LiveElapsedMsContext.Provider value={liveExtraMs}>
      {children}
    </LiveElapsedMsContext.Provider>
  );
}

/**
 * 날짜 바 ~ 타임테이블 (스크롤 본문)
 * - LiveElapsedTicker 하위 — 초 단위 tick이 친구 바(형제)까지 전파되지 않음
 */
function TimerLiveScrollInner({
  styles,
  normalize,
  isViewingToday,
  totalElapsedMs,
  displayTotalElapsedMs,
  displaySessions,
  displaySubjects,
  displayTasks,
  isRunning,
  activeSubjectId,
  selectedDayKey,
  goPrevDay,
  goNextDay,
  setShowCalendar,
  handleSaveAsImage,
  toggleTimer,
  pauseTimer,
  startForSubject,
  collapsedSubjects,
  toggleSubjectCollapsed,
  openAddTaskForSubject,
  setShowAddSubject,
  setTaskStatus,
  deleteSubject,
  deleteTask,
}) {
  const liveExtraMs = useContext(LiveElapsedMsContext);
  const displayTotalMs = isViewingToday
    ? totalElapsedMs + (isRunning ? liveExtraMs : 0)
    : displayTotalElapsedMs;

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    const nowSec = getSecondsFromSixAM(new Date());
    return displaySessions
      .filter((s) => s.subjectId === subjectId && s.endSeconds != null)
      .reduce((sum, s) => sum + getSessionDurationMs(s, nowSec), 0);
  };

  const getSlotSegments = (slotStartSeconds) => {
    const slotStart = toTimerDayTimelineSeconds(slotStartSeconds);
    const slotEnd = slotStart + 600;
    const nowSec = getSecondsFromSixAM(new Date());
    const segments = [];
    displaySessions.forEach((s) => {
      const startSec = toTimerDayTimelineSeconds(s.startSeconds);
      const endSecRaw = s.endSeconds != null ? s.endSeconds : nowSec;
      const endSec =
        s.endSeconds != null
          ? toTimerDayEndAwareSeconds(endSecRaw)
          : toTimerDayTimelineSeconds(endSecRaw);
      const adjustedEndSec = endSec < startSec ? endSec + 86400 : endSec;
      if (adjustedEndSec <= slotStart || startSec >= slotEnd) return;
      const overlapStart = Math.max(startSec, slotStart);
      const overlapEnd = Math.min(adjustedEndSec, slotEnd);
      const startFraction = (overlapStart - slotStart) / 600;
      const widthFraction = (overlapEnd - overlapStart) / 600;
      if (widthFraction <= 0) return;
      const color = resolveSessionColor(s, displaySubjects);
      if (!color) return;
      segments.push({ color, widthFraction, startFraction });
    });
    segments.sort((a, b) => a.startFraction - b.startFraction);
    return segments;
  };

  const renderTimetable = () =>
    HOURS.map((rowIndex) => {
      const hour = (6 + rowIndex) % 24;
      const slotStartBaseSeconds = ((hour - 6 + 24) % 24) * 3600;
      return (
        <View key={rowIndex} style={styles.timetableRow}>
          <View style={styles.timetableHourCell}>
            <Text style={styles.timetableHourText}>
              {hour.toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.timetableSlotsRow}>
            {[0, 10, 20, 30, 40, 50].map((m) => {
              const slotStartSeconds = slotStartBaseSeconds + m * 60;
              const segments = getSlotSegments(slotStartSeconds);
              let pos = 0;
              return (
                <View key={m} style={styles.timetableSlotCell}>
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
                                backgroundColor: colors.background,
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
    });

  return (
    <>
      <View style={styles.timerCard}>
        <View style={styles.dateBar}>
          <View style={styles.dateBarLeft}>
            <TouchableOpacity
              onPress={goPrevDay}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.dateBarNavBtn}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              style={styles.dateBarDateTouch}
            >
              <Text style={styles.dateBarText}>
                {selectedDayKey
                  ? selectedDayKey.replace(/-/g, '.')
                  : '--.--.--'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goNextDay}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.dateBarNavBtn}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAsImage}>
            <Feather name="download" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.timerBlock}>
          <Text style={styles.timerTime}>{formatHMS(displayTotalMs)}</Text>
          {isViewingToday && (
            <TouchableOpacity
              style={[styles.timerBtn, isRunning && styles.timerBtnPause]}
              onPress={toggleTimer}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={normalize(20)}
                color={isRunning ? colors.textPrimary : colors.textWhite}
              />
              <Text
                style={[
                  styles.timerBtnText,
                  isRunning && styles.timerBtnTextPause,
                ]}
              >
                {isRunning ? '일시정지' : '시작'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.todoTimetableRow}>
        <View style={styles.todoColumn}>
          <View style={styles.todoHeader}>
            <Text style={styles.todoTitle}>투두리스트</Text>
            {isViewingToday && (
              <TouchableOpacity
                style={styles.todoAddBtn}
                onPress={() => setShowAddSubject(true)}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={styles.todoAddBtnText}>과목 추가</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            style={styles.todoList}
            showsVerticalScrollIndicator={false}
          >
            {displaySubjects.map((sub) => {
              const subTasks = displayTasks.filter(
                (t) => t.subjectId === sub.id,
              );
              const totalMs = getSubjectTotalMs(sub.id);
              const isThisRunning = isRunning && activeSubjectId === sub.id;
              const totalStr = isThisRunning
                ? formatHMS(totalMs + liveExtraMs)
                : formatHMS(totalMs);
              const isCollapsed = collapsedSubjects[sub.id] === true;
              return (
                <View key={sub.id} style={styles.subjectBlock}>
                  <TouchableOpacity
                    style={styles.subjectRow}
                    activeOpacity={1}
                    onLongPress={() => deleteSubject?.(sub)}
                    delayLongPress={350}
                    disabled={!isViewingToday}
                  >
                    <View
                      style={[
                        styles.subjectColorBar,
                        { backgroundColor: sub.color },
                      ]}
                    />
                    <View style={styles.subjectBody}>
                      <Text style={styles.subjectName}>{sub.name}</Text>
                      <Text style={styles.subjectTime}>{totalStr}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.subjectPlayBtn,
                        { backgroundColor: sub.color },
                        isThisRunning && styles.subjectPlayBtnActive,
                      ]}
                      onPress={() =>
                        isRunning && activeSubjectId === sub.id
                          ? pauseTimer()
                          : startForSubject(sub.id)
                      }
                      disabled={!isViewingToday}
                    >
                      <Ionicons
                        name={isThisRunning ? 'pause' : 'play'}
                        size={normalize(18)}
                        color={colors.textWhite}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.subjectCollapseBtn}
                      onPress={() => toggleSubjectCollapsed(sub.id)}
                    >
                      <Ionicons
                        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={normalize(20)}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {!isCollapsed && (
                    <>
                      {subTasks.map((task) => (
                        <TouchableOpacity
                          key={task.id}
                          style={styles.taskRow}
                          activeOpacity={1}
                          onLongPress={() => deleteTask?.(task)}
                          delayLongPress={350}
                          disabled={!isViewingToday}
                        >
                          <TouchableOpacity
                            style={[
                              styles.taskCheckbox,
                              task.status === 'done' &&
                                styles.taskCheckboxChecked,
                            ]}
                            onPress={() =>
                              isViewingToday &&
                              setTaskStatus(
                                task.id,
                                task.status === 'done' ? 'pending' : 'done',
                              )
                            }
                            disabled={!isViewingToday}
                          >
                            {task.status === 'done' && (
                              <Ionicons
                                name="checkmark"
                                size={normalize(14)}
                                color={colors.textWhite}
                              />
                            )}
                          </TouchableOpacity>
                          <Text
                            style={[
                              styles.taskContent,
                              task.status === 'done' && styles.taskContentDone,
                            ]}
                            numberOfLines={1}
                          >
                            {task.content}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.todoAddUnderSubject}
                        onPress={() => openAddTaskForSubject(sub.id)}
                        disabled={!isViewingToday}
                      >
                        <Text style={styles.todoAddUnderSubjectText}>
                          + 추가
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.timetableColumn}>
          <Text style={styles.timetableTitle}>공부 기록</Text>
          <View style={styles.timetableScroll}>{renderTimetable()}</View>
        </View>
      </View>
    </>
  );
}

/** ViewShot 캡처 영역 — LiveElapsedTicker 하위에서만 동작 */
function TimerLivePlannerCapture({
  capturePlannerRef,
  styles,
  normalize,
  isViewingToday,
  isRunning,
  totalElapsedMs,
  displayTotalElapsedMs,
  displaySessions,
  displaySubjects,
  displayTasks,
  selectedDayKey,
  width,
}) {
  const liveExtraMs = useContext(LiveElapsedMsContext);
  const displayTotalMs = isViewingToday
    ? totalElapsedMs + (isRunning ? liveExtraMs : 0)
    : displayTotalElapsedMs;

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    const nowSec = getSecondsFromSixAM(new Date());
    return displaySessions
      .filter((s) => s.subjectId === subjectId && s.endSeconds != null)
      .reduce((sum, s) => sum + getSessionDurationMs(s, nowSec), 0);
  };

  const getSlotSegments = (slotStartSeconds) => {
    const slotStart = toTimerDayTimelineSeconds(slotStartSeconds);
    const slotEnd = slotStart + 600;
    const nowSec = getSecondsFromSixAM(new Date());
    const segments = [];
    displaySessions.forEach((s) => {
      const startSec = toTimerDayTimelineSeconds(s.startSeconds);
      const endSecRaw = s.endSeconds != null ? s.endSeconds : nowSec;
      const endSec =
        s.endSeconds != null
          ? toTimerDayEndAwareSeconds(endSecRaw)
          : toTimerDayTimelineSeconds(endSecRaw);
      const adjustedEndSec = endSec < startSec ? endSec + 86400 : endSec;
      if (adjustedEndSec <= slotStart || startSec >= slotEnd) return;
      const overlapStart = Math.max(startSec, slotStart);
      const overlapEnd = Math.min(adjustedEndSec, slotEnd);
      const startFraction = (overlapStart - slotStart) / 600;
      const widthFraction = (overlapEnd - overlapStart) / 600;
      if (widthFraction <= 0) return;
      const color = resolveSessionColor(s, displaySubjects);
      if (!color) return;
      segments.push({ color, widthFraction, startFraction });
    });
    segments.sort((a, b) => a.startFraction - b.startFraction);
    return segments;
  };

  const renderTimetable = () =>
    HOURS.map((rowIndex) => {
      const hour = (6 + rowIndex) % 24;
      const slotStartBaseSeconds = ((hour - 6 + 24) % 24) * 3600;
      return (
        <View key={rowIndex} style={styles.timetableRow}>
          <View style={styles.timetableHourCell}>
            <Text style={styles.timetableHourText}>
              {hour.toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.timetableSlotsRow}>
            {[0, 10, 20, 30, 40, 50].map((m) => {
              const slotStartSeconds = slotStartBaseSeconds + m * 60;
              const segments = getSlotSegments(slotStartSeconds);
              let pos = 0;
              return (
                <View key={m} style={styles.timetableSlotCell}>
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
                                backgroundColor: colors.background,
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
    });

  return (
    <View
      style={styles.plannerCaptureOffscreen}
      pointerEvents="none"
    >
      <ViewShot
        ref={capturePlannerRef}
        options={{ format: 'png', quality: 1 }}
        style={styles.viewShotBg}
      >
        <View style={styles.plannerCaptureWrap}>
          <View style={styles.plannerCaptureRow}>
            <View style={styles.plannerLeftColumn}>
              <Text style={styles.plannerLabel}>Date</Text>
              <Text style={styles.plannerValue}>
                {selectedDayKey
                  ? selectedDayKey.replace(/-/g, '.')
                  : '--.--.--'}
              </Text>
              <Text style={styles.plannerLabel}>Time</Text>
              <Text style={styles.plannerValue}>
                {formatHMS(displayTotalMs)}
              </Text>
              <Text style={styles.plannerLabel}>To-do List</Text>
              <View style={styles.plannerMemoLine} />
              {displaySubjects.map((sub) => {
                const subTasks = displayTasks.filter(
                  (t) => t.subjectId === sub.id,
                );
                const totalStr = formatHMS(getSubjectTotalMs(sub.id));
                return (
                  <View key={sub.id} style={styles.plannerSubjectListItem}>
                    <View style={styles.plannerSubjectRow}>
                      <View
                        style={[
                          styles.plannerSubjectColorBar,
                          { backgroundColor: sub.color },
                        ]}
                      />
                      <View style={styles.plannerSubjectBody}>
                        <Text style={styles.plannerSubjectName}>
                          {sub.name}
                        </Text>
                        <Text style={styles.plannerSubjectTime}>
                          {totalStr}
                        </Text>
                      </View>
                    </View>
                    {subTasks.map((task) => (
                      <View key={task.id} style={styles.plannerTaskRow}>
                        <View
                          style={[
                            styles.plannerTaskCheckbox,
                            task.status === 'done' &&
                              styles.plannerTaskCheckboxChecked,
                          ]}
                        >
                          {task.status === 'done' && (
                            <Ionicons
                              name="checkmark"
                              size={normalize(12)}
                              color={colors.textWhite}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.plannerTaskContent,
                            task.status === 'done' &&
                              styles.plannerTaskContentDone,
                          ]}
                          numberOfLines={1}
                        >
                          {task.content}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
            <View style={styles.plannerRightColumn}>
              <Text style={styles.timetableTitle}>공부 기록</Text>
              <View style={styles.timetableScroll}>{renderTimetable()}</View>
            </View>
          </View>
        </View>
      </ViewShot>
    </View>
  );
}

// ── 메인 콘텐츠 ──────────────────────────────────────────
// 화면 로직의 대부분이 모여 있는 컴포넌트
// - 상단: 친구 스토리 바 + 오늘 타이머 요약
// - 중간: 과목/할일 리스트 + 공부 기록 타임테이블
// - 하단: 각종 모달들(AddSubject/AddTask/Calendar/친구 관련)
export const TimerContent = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize],
  );
  const isFocused = useIsFocused();

  // ── 친구 상태 ─────────────────────────────────────────
  // - 상단 FriendStoryBar + 친구 모달에서 사용하는 친구 목록/쿡 찌르기 대상
  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pokeTarget, setPokeTarget] = useState(null);
  const [pokeVisible, setPokeVisible] = useState(false);

  const { showToast, setIsTimerScreenActive } = useToast();
  const pushTimerToast = (senderName, body) => {
    const s = String(senderName || '').trim();
    const b = String(body || '').trim();
    if (!b) return;
    const hasSender = s.length > 0;
    showToast({
      message: hasSender ? `${s}: ${b}` : b,
      senderName: hasSender ? s : null,
      body: hasSender ? b : null,
      showProgress: true,
    });
  };

  const { studyingFriends, refreshStudyingFriends } = useFriend();

  // ── 실시간 소켓 이벤트 연동 ─────────────────────────────
  const { emitTimerStatus } = useFriendSocketEvents({});

  useFriendStudyEvents({
    onFriendStudyFinished: () => {},
    onPoke: (payload) => {
      const senderName = String(
        payload?.fromNickname ??
          payload?.fromName ??
          payload?.senderName ??
          payload?.nickname ??
          payload?.name ??
          '',
      ).trim();
      pushTimerToast(
        '',
        senderName
          ? `${senderName} 님이 쿡 찔렀어요`
          : '누군가 쿡 찔렀어요',
      );
    },
    onMyStudyFinishedSummary: ({ toastText, watchers, createdAt, type }) => {
      const watcherList = Array.isArray(watchers) ? watchers : [];
      if (watcherList.length === 0) return;
      const summaryBody = String(toastText || '').trim();
      if (!summaryBody) return;
      showToast({
        message: summaryBody,
        senderName: null,
        body: null,
        relatedType: 'friend_study_finished_summary',
        relatedId: createdAt ? String(createdAt) : null,
        type: type || 'study_finished_summary',
        category: 'system',
        watchers: watcherList,
        showProgress: true,
      });
    },
  });

  // ── 친구 목록 로드 (백엔드 연동) ─────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadFriends = async () => {
      try {
        const res = await api.get('/api/friends/list');
        const list = res.data?.data ?? [];
        if (!mounted) return;
        setFriends(
          list.map((f, index) => ({
            id: f.userId,
            name: f.name || f.username || '친구',
            colorId: f.colorId ?? f.profileColorId ?? f.profile_color_id ?? f.profileColor?.id,
            colorIndex: index % FRIEND_ICON_COLORS.length,
          })),
        );
      } catch (error) {
        console.error('타이머 친구 목록 조회 실패:', error);
      }
    };
    loadFriends();
    return () => {
      mounted = false;
    };
  }, []);

  // 타이머 화면 진입 시: 놓친 친구 공부 상태 REST로만 보완 + 소켓 미연결 시 재연결
  useFocusEffect(
    React.useCallback(() => {
      setIsTimerScreenActive?.(true);
      refreshStudyingFriends?.();
      if (isRunning) {
        cancelTimerRunningNotification();
      }
      if (isRunning) {
        setTimerRuntimeState({
          countdownBaseTimestamp: null,
          countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
        });
      }
      return () => {
        if (isRunning) {
          setTimerRuntimeState({
            countdownBaseTimestamp: Date.now(),
            countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
          });
        }
        setIsTimerScreenActive?.(false);
      };
    }, [refreshStudyingFriends, setIsTimerScreenActive, isRunning]),
  );

  // 친구 관련 핸들러 (모달 열기까지만 담당, 쿡 찌르기 로직은 FriendPokeController 에서 처리)
  const handleOpenAddFriend = useCallback(() => setShowAddFriend(true), []);
  const handleFriendPress = useCallback(
    (friend) => {
      const isActive = studyingFriends?.[friend.id] === true;
      setPokeTarget({ ...friend, isActive });
      setPokeVisible(true);
    },
    [studyingFriends],
  );

  // ── 타이머/투두 상태 ──────────────────────────────────
  // - 과목/할일/세션/날짜/타이머 실행 여부 등 메인 비즈니스 상태
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [sessions, setSessions] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskSubjectId, setAddTaskSubjectId] = useState(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const [timerDayKey, setTimerDayKey] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const prevIsRunningRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundEnteredAtRef = useRef(null);
  const wasRunningOnBackgroundRef = useRef(false);
  const backgroundDayKeyRef = useRef(null);
  const closeIncompleteLockRef = useRef(false);
  const rolloverLockRef = useRef(false);
  const pendingImmediatePersistReasonRef = useRef(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [viewState, setViewState] = useState(null);
  const capturePlannerRef = useRef(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const latestSnapshotRef = useRef({
    timerDayKey: null,
    sessions: [],
    totalElapsedMs: 0,
    subjects: [],
    tasks: [],
  });
  const persistChainRef = useRef(Promise.resolve());
  const persistRequestIdRef = useRef(0);
  const baselineSignatureRef = useRef(null);

  const todayKey = getTimerDayKey(new Date());
  const timetableDebugRef = useRef({
    dayKey: null,
    sessionsCount: null,
    subjectsCount: null,
  });

  useEffect(() => {
    latestSnapshotRef.current = {
      timerDayKey,
      sessions,
      totalElapsedMs,
      subjects,
      tasks,
    };
  }, [timerDayKey, sessions, totalElapsedMs, subjects, tasks]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[TimerState][isRunning_change]', {
      at: new Date().toISOString(),
      isRunning,
      startTimestamp,
      activeSubjectId,
      timerDayKey,
      selectedDayKey,
      appState: appStateRef.current,
    });
  }, [isRunning, startTimestamp, activeSubjectId, timerDayKey, selectedDayKey]);

  const persistTimerSnapshot = useCallback(
    (reason, override = null) => {
      const snapshot = override ?? latestSnapshotRef.current;
      const dayKey = snapshot?.timerDayKey;
      if (!dayKey) return Promise.resolve(false);
      const snapshotSessions = buildSnapshotCompleteSessions(
        snapshot?.sessions ?? [],
        snapshot?.subjects ?? [],
      );
      const payload = {
        sessions: snapshotSessions,
        totalElapsedMs: snapshot?.totalElapsedMs ?? 0,
        subjects: snapshot?.subjects ?? [],
        tasks: snapshot?.tasks ?? [],
      };
      const hasSubjectBoundSession = payload.sessions.some(
        (s) => s?.subjectId != null,
      );
      const shouldBlockEmptyOverwrite =
        hasSubjectBoundSession && payload.subjects.length === 0;
      if (shouldBlockEmptyOverwrite) {
        return Promise.resolve(false);
      }
      const requestId = ++persistRequestIdRef.current;
      persistChainRef.current = persistChainRef.current.then(async () => {
        if (requestId !== persistRequestIdRef.current) {
          return false;
        }
        const ok = await saveDayToDb(dayKey, payload);
        if (ok && dayKey === latestSnapshotRef.current?.timerDayKey) {
          baselineSignatureRef.current = getPayloadSignature(payload);
        }
        return ok;
      });
      return persistChainRef.current;
    },
    [],
  );

  const requestImmediatePersist = useCallback((reason) => {
    pendingImmediatePersistReasonRef.current = reason || 'immediate';
  }, []);

  const performTimerDayRollover = useCallback(
    async (nextDayKey, reason = 'day-rollover') => {
      if (!nextDayKey || rolloverLockRef.current) return;
      rolloverLockRef.current = true;
      try {
        const snapshot = latestSnapshotRef.current;
        const prevDayKey = snapshot?.timerDayKey;
        if (!prevDayKey || prevDayKey === nextDayKey) return;

        const prevSubjects = Array.isArray(snapshot?.subjects)
          ? snapshot.subjects
          : [];
        const prevTasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
        const prevSessions = buildSnapshotCompleteSessions(
          snapshot?.sessions ?? [],
          prevSubjects,
        );
        const activeMeta =
          activeSubjectId == null
            ? null
            : prevSubjects.find((s) => Number(s?.id) === Number(activeSubjectId)) ||
              null;

        const closedPrevSessions = (() => {
          const next = [...prevSessions];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i]?.endSeconds == null) {
              next[i] = {
                ...next[i],
                endSeconds: TIMER_DAY_END_SECONDS,
              };
              return next;
            }
          }
          return next;
        })();

        await persistTimerSnapshot(`${reason}-flush`, {
          timerDayKey: prevDayKey,
          sessions: closedPrevSessions,
          totalElapsedMs: snapshot?.totalElapsedMs ?? 0,
          subjects: prevSubjects,
          tasks: prevTasks,
        });

        setTimerDayKey(nextDayKey);
        setSelectedDayKey(nextDayKey);
        setViewState(null);
        setTotalElapsedMs(0);
        setSessions([
          {
            subjectId: activeSubjectId != null ? Number(activeSubjectId) : null,
            subjectName: activeMeta?.name ?? null,
            subjectColor: activeMeta?.color ?? null,
            startSeconds: 0,
            endSeconds: null,
          },
        ]);
        setStartTimestamp(Date.now());
      } finally {
        rolloverLockRef.current = false;
      }
    },
    [activeSubjectId, persistTimerSnapshot],
  );

  // ── 서버 로드/저장 ────────────────────────────────────
  const loadDayData = async (dayKey) => {
    if (dayKey > todayKey) return null;
    return loadDayFromDb(dayKey);
  };

  useEffect(() => {
    let mounted = true;
    const dayKey = getTimerDayKey(new Date());
    loadDayFromDb(dayKey).then((data) => {
      if (!mounted) return;
      const normalized = normalizeDayPayload(data);
      baselineSignatureRef.current = getPayloadSignature(normalized);
      setTimerDayKey(dayKey);
      setSelectedDayKey(dayKey);
      if (data != null) {
        const loadedSessions = normalized.sessions;
        setSessions(loadedSessions);
        setTotalElapsedMs(normalized.totalElapsedMs);
        setSubjects(normalized.subjects);
        setTasks(normalized.tasks);

        // 진행 중 세션이 있으면 타이머 상태 복구
        const now = new Date();
        const nowSec = getSecondsFromSixAM(now);
        let openSession = null;
        for (let i = loadedSessions.length - 1; i >= 0; i -= 1) {
          if (loadedSessions[i].endSeconds == null) {
            openSession = loadedSessions[i];
            break;
          }
        }
        if (openSession) {
          const startSec = toTimerDayTimelineSeconds(openSession.startSeconds);
          const nowTimelineSec = toTimerDayTimelineSeconds(nowSec);
          const adjustedNowSec =
            nowTimelineSec < startSec ? nowTimelineSec + 86400 : nowTimelineSec;
          const elapsedSec = Math.max(0, adjustedNowSec - startSec);
          const isGhostOpenSession =
            elapsedSec > TIMER_RECOVER_OPEN_SESSION_MAX_SECONDS;

          if (isGhostOpenSession) {
            setIsRunning(false);
            setActiveSubjectId(null);
            setStartTimestamp(null);
          } else {
            const diffMs = elapsedSec * 1000;
            setIsRunning(true);
            setActiveSubjectId(
              openSession.subjectId != null ? openSession.subjectId : null,
            );
            const ts = Date.now() - diffMs;
            setStartTimestamp(ts);
          }
        } else {
          setIsRunning(false);
          setActiveSubjectId(null);
          setStartTimestamp(null);
        }
      }
      setInitialLoadDone(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadDone || selectedDayKey == null) return;
    if (selectedDayKey === todayKey) {
      setViewState(null);
      return;
    }
    loadDayData(selectedDayKey).then((data) => {
      setViewState(
        data
          ? {
              sessions: data.sessions ?? [],
              totalElapsedMs: data.totalElapsedMs ?? 0,
              subjects: data.subjects?.length
                ? data.subjects
                : DEFAULT_SUBJECTS,
              tasks: data.tasks?.length ? data.tasks : DEFAULT_TASKS,
            }
          : {
              sessions: [],
              totalElapsedMs: 0,
              subjects: DEFAULT_SUBJECTS,
              tasks: DEFAULT_TASKS,
            },
      );
    });
  }, [selectedDayKey, todayKey, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone || timerDayKey == null || selectedDayKey !== todayKey) {
      pendingImmediatePersistReasonRef.current = null;
      return;
    }
    const reason = pendingImmediatePersistReasonRef.current;
    if (!reason) return;
    pendingImmediatePersistReasonRef.current = null;
    persistTimerSnapshot(reason);
  }, [
    initialLoadDone,
    timerDayKey,
    selectedDayKey,
    todayKey,
    sessions,
    totalElapsedMs,
    subjects,
    tasks,
    persistTimerSnapshot,
  ]);

  useEffect(() => {
    if (!initialLoadDone || timerDayKey == null || selectedDayKey !== todayKey) {
      return undefined;
    }
    if (!isRunning) return undefined;
    const autosaveInterval = setInterval(() => {
      const currentSig = getPayloadSignature(latestSnapshotRef.current);
      if (baselineSignatureRef.current === currentSig) return;
      persistTimerSnapshot('running-interval-autosave');
    }, TIMER_RUNNING_AUTOSAVE_INTERVAL_MS);
    return () => {
      clearInterval(autosaveInterval);
    };
  }, [
    initialLoadDone,
    timerDayKey,
    selectedDayKey,
    todayKey,
    isRunning,
    persistTimerSnapshot,
  ]);

  useEffect(() => {
    const checkDayChange = () => {
      const nowKey = getTimerDayKey(new Date());
      if (timerDayKey != null && nowKey !== timerDayKey) {
        if (isRunning) {
          performTimerDayRollover(nowKey, 'foreground-day-rollover');
          return;
        }
        persistTimerSnapshot('day-change-flush').then(() => {
          setTimerDayKey(nowKey);
          setSelectedDayKey(nowKey);
          loadDayFromDb(nowKey).then((data) => {
            if (data != null) {
              setSessions(data.sessions ?? []);
              setTotalElapsedMs(data.totalElapsedMs ?? 0);
              setSubjects(
                data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS,
              );
              setTasks(data.tasks?.length ? data.tasks : DEFAULT_TASKS);
            } else {
              setSessions([]);
              setTotalElapsedMs(0);
              setSubjects(DEFAULT_SUBJECTS);
              setTasks(DEFAULT_TASKS);
            }
            setActiveSubjectId(null);
            setIsRunning(false);
            setStartTimestamp(null);
          });
        });
      }
    };
    const interval = setInterval(checkDayChange, 60 * 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDayChange();
    });
    return () => {
      clearInterval(interval);
      sub?.remove();
    };
  }, [
    timerDayKey,
    sessions,
    totalElapsedMs,
    subjects,
    tasks,
    isRunning,
    performTimerDayRollover,
  ]);

  // ── 투두/과목 핸들러 ──────────────────────────────────
  const addSubject = async (payload) => {
    const dayKey = timerDayKey ?? getTimerDayKey(new Date());
    try {
      const res = await api.post('/api/timer/subjects', {
        dayKey,
        name: payload.name,
        color: payload.color,
      });
      const created = res.data?.data;
      if (!created?.id) return;
      setSubjects((prev) => [
        ...prev,
        { id: Number(created.id), name: created.name, color: created.color },
      ]);
    } catch (error) {
      console.error('[Timer] 과목 생성 실패:', error);
    }
  };

  const addTask = async (payload) => {
    const dayKey = timerDayKey ?? getTimerDayKey(new Date());
    try {
      const res = await api.post('/api/timer/tasks', {
        dayKey,
        subjectId: payload.subjectId,
        content: payload.content,
        status: 'pending',
      });
      const created = res.data?.data;
      if (!created?.id) return;
      setTasks((prev) => [
        ...prev,
        {
          id: Number(created.id),
          subjectId:
            created.subjectId != null ? Number(created.subjectId) : null,
          content: created.content,
          status: created.status === 'done' ? 'done' : 'pending',
        },
      ]);
    } catch (error) {
      console.error('[Timer] 할일 생성 실패:', error);
    }
  };

  const setTaskStatus = async (taskId, status) => {
    const nextStatus = status === 'done' ? 'done' : 'pending';
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );
    try {
      await api.patch(`/api/timer/tasks/${taskId}`, { status: nextStatus });
    } catch (error) {
      console.error('[Timer] 할일 상태 변경 실패:', error);
    }
  };

  const endCurrentSession = () => {
    if (startTimestamp == null) return 0;
    const duration = Date.now() - startTimestamp;
    setTotalElapsedMs((prev) => prev + duration);
    return duration;
  };

  // ── 타이머 제어 ───────────────────────────────────────
  const closeOpenSession = (subjectId) =>
    setSessions((prev) => {
      const next = [...prev];
      const nowSec = normalizeClockSeconds(getSecondsFromSixAM(new Date()), 0);
      let closed = false;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].subjectId === subjectId && next[i].endSeconds == null) {
          next[i] = {
            ...next[i],
            endSeconds: nowSec,
          };
          closed = true;
          break;
        }
      }
      if (!closed) {
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].endSeconds == null) {
            next[i] = {
              ...next[i],
              endSeconds: nowSec,
            };
            break;
          }
        }
      }
      return next;
    });

  const startForSubject = (subjectId) => {
    if (__DEV__) {
      console.log('[TimerAction][startForSubject]', {
        at: new Date().toISOString(),
        subjectId,
        wasRunning: isRunning,
        activeSubjectId,
      });
    }
    if (isRunning && activeSubjectId === subjectId) return;
    if (isRunning) {
      endCurrentSession();
      closeOpenSession(activeSubjectId);
      requestImmediatePersist('subject-switch');
    }
    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const subjectName = selectedSubject?.name ?? null;
    const subjectColor = selectedSubject?.color ?? null;
    const nowSec = normalizeClockSeconds(getSecondsFromSixAM(new Date()), 0);
    setActiveSubjectId(subjectId);
    setIsRunning(true);
    setStartTimestamp(Date.now());
    setSessions((prev) => [
      ...prev,
      {
        subjectId,
        subjectName,
        subjectColor,
        startSeconds: nowSec,
        endSeconds: null,
      },
    ]);
    emitTimerStatus('studying', {
      dayKey: timerDayKey ?? getTimerDayKey(new Date()),
      subjectId,
      subjectName,
      startSeconds: nowSec,
    });
    requestImmediatePersist('timer-start');
  };

  const startTimerTop = () => {
    if (__DEV__) {
      console.log('[TimerAction][startTimerTop]', {
        at: new Date().toISOString(),
        wasRunning: isRunning,
        activeSubjectId,
      });
    }
    if (isRunning && activeSubjectId === null) return;
    if (isRunning) {
      endCurrentSession();
      closeOpenSession(activeSubjectId);
      requestImmediatePersist('subject-switch');
    }
    const nowSec = normalizeClockSeconds(getSecondsFromSixAM(new Date()), 0);
    setActiveSubjectId(null);
    setIsRunning(true);
    setStartTimestamp(Date.now());
    setSessions((prev) => [
      ...prev,
      {
        subjectId: null,
        subjectName: null,
        subjectColor: null,
        startSeconds: nowSec,
        endSeconds: null,
      },
    ]);
    emitTimerStatus('studying', {
      dayKey: timerDayKey ?? getTimerDayKey(new Date()),
      subjectId: null,
      subjectName: null,
      startSeconds: nowSec,
    });
    requestImmediatePersist('timer-start');
  };

  const pauseTimer = () => {
    if (__DEV__) {
      console.log('[TimerAction][pauseTimer]', {
        at: new Date().toISOString(),
        isRunning,
        activeSubjectId,
      });
    }
    if (!isRunning) return;
    endCurrentSession();
    closeOpenSession(activeSubjectId);
    setIsRunning(false);
    setStartTimestamp(null);
    requestImmediatePersist('pause');
    emitTimerStatus('idle');
  };

  const toggleTimer = () => (isRunning ? pauseTimer() : startTimerTop());

  const reloadTodayFromServer = useCallback(async () => {
    const dayKey = timerDayKey ?? getTimerDayKey(new Date());
    const data = await loadDayFromDb(dayKey);
    if (data == null) return;
    const normalized = normalizeDayPayload(data);
    setSessions(normalized.sessions);
    setTotalElapsedMs(normalized.totalElapsedMs);
    setSubjects(normalized.subjects);
    setTasks(normalized.tasks);
  }, [timerDayKey]);

  const deleteSubject = useCallback(
    (subject) => {
      if (!isViewingToday || !subject?.id) return;
      const isDeletingActiveSubject = activeSubjectId === subject.id;
      const alertMessage = isDeletingActiveSubject && isRunning
        ? '과목을 삭제하시겠습니까? 관련 할 일도 삭제되지만, 공부 기록은 보존됩니다.\n\n현재 측정 중인 과목입니다. 삭제 시 타이머가 일시정지됩니다.'
        : '과목을 삭제하시겠습니까? 관련 할 일도 삭제되지만, 공부 기록은 보존됩니다.';
      Alert.alert(
        '과목 삭제',
        alertMessage,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.delete(`/api/timer/subjects/${subject.id}`);
                setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
                setTasks((prev) => prev.filter((t) => t.subjectId !== subject.id));
                if (isDeletingActiveSubject && isRunning) {
                  pauseTimer();
                  setActiveSubjectId(null);
                  persistTimerSnapshot('delete-active-subject');
                } else if (isDeletingActiveSubject) {
                  setActiveSubjectId(null);
                }
                await reloadTodayFromServer();
              } catch (error) {
                console.error('[Timer] 과목 삭제 실패:', error);
                Alert.alert('삭제 실패', '과목 삭제 중 문제가 발생했어요');
              }
            },
          },
        ],
      );
    },
    [
      isViewingToday,
      activeSubjectId,
      isRunning,
      pauseTimer,
      persistTimerSnapshot,
      reloadTodayFromServer,
    ],
  );

  const deleteTask = useCallback(
    (task) => {
      if (!isViewingToday || !task?.id) return;
      Alert.alert('할 일 삭제', '이 할 일을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/timer/tasks/${task.id}`);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
              await reloadTodayFromServer();
            } catch (error) {
              console.error('[Timer] 할 일 삭제 실패:', error);
              Alert.alert('삭제 실패', '할 일 삭제 중 문제가 발생했어요');
            }
          },
        },
      ]);
    },
    [isViewingToday, reloadTodayFromServer],
  );

  useEffect(() => {
    if (!isRunning) return undefined;
    emitTimerStatus('heartbeat');
    const heartbeatInterval = setInterval(() => {
      emitTimerStatus('heartbeat');
    }, TIMER_HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isRunning, emitTimerStatus]);

  useEffect(() => {
    prevIsRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    return () => {
      persistTimerSnapshot('unmount-flush');
    };
  }, [persistTimerSnapshot]);

  useEffect(() => {
    if (!isRunning || startTimestamp == null) {
      setTimerRuntimeState({
        isRunning: false,
        startTimestamp: null,
        countdownBaseTimestamp: null,
        countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
        countdownTotalSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
      });
      cancelTimerRunningNotification();
      return undefined;
    }

    const syncRuntimeCountdown = () => {
      const runtimeState = getTimerRuntimeState();
      const runtimeBase = Number(runtimeState?.countdownBaseTimestamp);
      const countdownBaseTimestamp =
        Number.isFinite(runtimeBase) && runtimeBase > 0
          ? runtimeBase
          : startTimestamp;
      const elapsedSec = Math.floor(
        (Date.now() - countdownBaseTimestamp) / 1000,
      );
      const remainingSec = Math.max(
        0,
        TIMER_COUNTDOWN_TOTAL_SECONDS - elapsedSec,
      );
      setTimerRuntimeState({
        isRunning: true,
        startTimestamp,
        countdownBaseTimestamp,
        countdownRemainingSec: remainingSec,
        countdownTotalSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
      });
      if (remainingSec === 0 && !isFocused) {
        pauseTimer();
      }
    };

    syncRuntimeCountdown();
    const countdownInterval = setInterval(syncRuntimeCountdown, 1000);
    return () => {
      clearInterval(countdownInterval);
    };
  }, [isRunning, startTimestamp, pauseTimer, isFocused]);

  useEffect(() => {
    const unregister = registerTimerStopHandler(() => {
      pauseTimer();
    });
    return unregister;
  }, [pauseTimer]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      const runningNow = prevIsRunningRef.current;

      if (nextState === 'inactive' || nextState === 'background') {
        backgroundEnteredAtRef.current = Date.now();
        wasRunningOnBackgroundRef.current = runningNow;
        backgroundDayKeyRef.current = timerDayKey ?? getTimerDayKey(new Date());
        persistTimerSnapshot('app-background');
        return;
      }

      if (
        prevState.match(/inactive|background/) &&
        nextState === 'active' &&
        wasRunningOnBackgroundRef.current
      ) {
        const enteredAt = backgroundEnteredAtRef.current ?? Date.now();
        const backgroundMs = Math.max(0, Date.now() - enteredAt);
        const currentDayKey = getTimerDayKey(new Date());
        const backgroundDayKey = backgroundDayKeyRef.current ?? timerDayKey;

        if (
          backgroundMs >= TIMER_BACKGROUND_AUTO_CLOSE_MS &&
          !closeIncompleteLockRef.current
        ) {
          closeIncompleteLockRef.current = true;
          (async () => {
            try {
              await api.post('/api/timer/session/close-incomplete');
              if (isRunning) {
                endCurrentSession();
                closeOpenSession(activeSubjectId);
                setIsRunning(false);
                setStartTimestamp(null);
                emitTimerStatus('idle');
              }
              if (currentDayKey && currentDayKey !== timerDayKey) {
                setTimerDayKey(currentDayKey);
                setSelectedDayKey(currentDayKey);
              }
              pushTimerToast(
                '',
                '백그라운드 유지 시간이 길어 세션이 자동으로 종료되었어요',
              );
            } catch (error) {
              console.error('[Timer] close-incomplete 호출 실패:', error);
            } finally {
              closeIncompleteLockRef.current = false;
            }
          })();
          return;
        }

        if (backgroundDayKey && currentDayKey !== backgroundDayKey) {
          performTimerDayRollover(currentDayKey, 'background-day-rollover');
          return;
        }
        if (isRunning && backgroundMs > 0) {
          // 15분 미만 백그라운드 체류 시간은 경과시간 계산에서 제외한다.
          setStartTimestamp((prevTs) => {
            if (prevTs == null) return prevTs;
            return prevTs + backgroundMs;
          });
        }
      } else if (nextState === 'active') {
        // 앱 복귀 시 잔여 타이머 알림을 항상 정리해서 0개 유지
        cancelTimerRunningNotification();
      }
    });
    return () => sub.remove();
  }, [
    isRunning,
    activeSubjectId,
    emitTimerStatus,
    timerDayKey,
    sessions,
    totalElapsedMs,
    subjects,
    tasks,
    persistTimerSnapshot,
    performTimerDayRollover,
  ]);

  // ── 날짜 이동 ─────────────────────────────────────────
  const goPrevDay = () => {
    if (!selectedDayKey) return;
    setSelectedDayKey(getPreviousDayKey(dateFromDayKey(selectedDayKey)));
  };
  const goNextDay = () => {
    if (!selectedDayKey) return;
    setSelectedDayKey(getNextDayKey(dateFromDayKey(selectedDayKey)));
  };

  // ── 이미지 저장 ───────────────────────────────────────
  const handleSaveAsImage = async () => {
    if (!capturePlannerRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 저장을 위해 갤러리 접근 권한이 필요해요');
        return;
      }
      const uri = await capturePlannerRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '갤러리에 저장되었어요');
    } catch (e) {
      Alert.alert('저장 실패', e?.message || '이미지 저장에 실패했어요. 다시 시도해 주세요');
    }
  };

  const toggleSubjectCollapsed = (subjectId) =>
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));

  const openAddTaskForSubject = (subjectId) => {
    setAddTaskSubjectId(subjectId);
    setShowAddTask(true);
  };

  // ── 표시 데이터 ───────────────────────────────────────
  const isViewingToday = selectedDayKey === todayKey;
  const displaySessions = isViewingToday
    ? sessions
    : (viewState?.sessions ?? []);
  const displayTotalElapsedMs = isViewingToday
    ? totalElapsedMs
    : (viewState?.totalElapsedMs ?? 0);
  const displaySubjects = isViewingToday
    ? subjects
    : (viewState?.subjects ?? DEFAULT_SUBJECTS);
  const displayTasks = isViewingToday
    ? tasks
    : (viewState?.tasks ?? DEFAULT_TASKS);

  const effectiveDisplaySubjects = useMemo(() => {
    const map = new Map();
    displaySubjects.forEach((sub) => {
      if (sub?.id == null) return;
      map.set(Number(sub.id), {
        id: Number(sub.id),
        name: sub.name || `과목-${sub.id}`,
        color: sub.color || TIMETABLE_GRAY,
      });
    });
    displaySessions.forEach((s) => {
      if (s?.subjectId == null) return;
      const key = Number(s.subjectId);
      if (map.has(key)) return;
      const snapshotName = String(s?.subjectName || '').trim();
      map.set(key, {
        id: Number(s.subjectId),
        name: snapshotName
          ? `${snapshotName} (삭제됨)`
          : `(삭제됨) 과목-${s.subjectId}`,
        color: s?.subjectColor || TIMETABLE_GRAY,
      });
    });
    return Array.from(map.values());
  }, [displaySubjects, displaySessions]);

  useEffect(() => {
    if (!selectedDayKey) return;
    timetableDebugRef.current = {
      dayKey: selectedDayKey,
      sessionsCount: displaySessions.length,
      subjectsCount: effectiveDisplaySubjects.length,
    };
  }, [selectedDayKey, displaySessions, effectiveDisplaySubjects]);

  // ─────────────────────────────────────────────────────
  // 실제 화면 레이아웃:
  // - 헤더/푸터는 Timer 래퍼에서 담당
  // - 여기서는 타이머 본문(친구 바 + 타이머 + 투두 + 타임테이블 + 모달)만 렌더링
  // - LiveElapsedTicker: 1초 tick이 FriendStoryBar(메모)까지 전파되지 않게 격리
  if (!initialLoadDone) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.friendStoryRow}>
          <View style={styles.friendStoryScroll}>
            {[0, 1, 2, 3].map((idx) => (
              <View key={`timer-friend-skel-${idx}`} style={styles.friendStoryCircleWrap}>
                <Skeleton width={normalize(56)} height={normalize(56)} borderRadius={normalize(28)} />
                <Skeleton width={normalize(44)} height={normalize(11)} borderRadius={normalize(6)} style={styles.timerSkelFriendName} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.timerCard}>
          <Skeleton width={normalize(180)} height={normalize(30)} borderRadius={normalize(10)} style={styles.timerSkelDateLine1} />
          <Skeleton width={normalize(92)} height={normalize(12)} borderRadius={normalize(6)} style={styles.timerSkelDateLine2} />
          <Skeleton width={normalize(140)} height={normalize(40)} borderRadius={normalize(20)} style={styles.timerSkelTimerBtn} />
        </View>

        <View style={styles.todoTimetableRow}>
          <View style={styles.todoColumn}>
            <Skeleton width={normalize(80)} height={normalize(13)} borderRadius={normalize(6)} style={styles.timerSkelColTitle} />
            {[0, 1, 2].map((idx) => (
              <View key={`timer-task-skel-${idx}`} style={styles.timerSkelTaskRow}>
                <Skeleton width={normalize(22)} height={normalize(22)} borderRadius={normalize(4)} />
                <Skeleton width="70%" height={normalize(13)} borderRadius={normalize(6)} />
              </View>
            ))}
          </View>
          <View style={styles.timetableColumn}>
            <Skeleton width={normalize(80)} height={normalize(13)} borderRadius={normalize(6)} style={styles.timerSkelColTitle} />
            {[0, 1, 2, 3].map((idx) => (
              <Skeleton
                key={`timer-table-skel-${idx}`}
                width="100%"
                height={normalize(42)}
                borderRadius={normalize(10)}
                style={styles.timerSkelTtRow}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <LiveElapsedTicker isRunning={isRunning} startTimestamp={startTimestamp}>
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <FriendStoryBar
              friends={friends}
              studyingFriends={studyingFriends}
              normalize={normalize}
              styles={styles}
              onFriendPress={handleFriendPress}
              onAddFriendPress={handleOpenAddFriend}
            />
            <TimerLiveScrollInner
              styles={styles}
              normalize={normalize}
              isViewingToday={isViewingToday}
              totalElapsedMs={totalElapsedMs}
              displayTotalElapsedMs={displayTotalElapsedMs}
              displaySessions={displaySessions}
              displaySubjects={effectiveDisplaySubjects}
              displayTasks={displayTasks}
              isRunning={isRunning}
              activeSubjectId={activeSubjectId}
              selectedDayKey={selectedDayKey}
              goPrevDay={goPrevDay}
              goNextDay={goNextDay}
              setShowCalendar={setShowCalendar}
              handleSaveAsImage={handleSaveAsImage}
              toggleTimer={toggleTimer}
              pauseTimer={pauseTimer}
              startForSubject={startForSubject}
              collapsedSubjects={collapsedSubjects}
              toggleSubjectCollapsed={toggleSubjectCollapsed}
              openAddTaskForSubject={openAddTaskForSubject}
              setShowAddSubject={setShowAddSubject}
              setTaskStatus={setTaskStatus}
              deleteSubject={deleteSubject}
              deleteTask={deleteTask}
            />
          </ScrollView>
          <TimerLivePlannerCapture
            capturePlannerRef={capturePlannerRef}
            styles={styles}
            normalize={normalize}
            isViewingToday={isViewingToday}
            isRunning={isRunning}
            totalElapsedMs={totalElapsedMs}
            displayTotalElapsedMs={displayTotalElapsedMs}
            displaySessions={displaySessions}
            displaySubjects={effectiveDisplaySubjects}
            displayTasks={displayTasks}
            selectedDayKey={selectedDayKey}
            width={width}
          />
        </>
      </LiveElapsedTicker>

      {/* ── 모달들 ── */}
      <AddSubjectModal
        visible={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        onAdd={addSubject}
      />
      <AddTaskModal
        visible={showAddTask}
        onClose={() => {
          setShowAddTask(false);
          setAddTaskSubjectId(null);
        }}
        onAdd={addTask}
        subjects={subjects}
        initialSubjectId={addTaskSubjectId}
      />
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        currentDayKey={selectedDayKey}
        onSelectDay={setSelectedDayKey}
      />

      {/* 친구 모달 (비즈니스 로직 포함 컴포넌트) */}
      <FriendPokeController
        visible={pokeVisible}
        friend={pokeTarget}
        onClose={() => {
          setPokeVisible(false);
          setPokeTarget(null);
        }}
      />
      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onAdd={async (raw) => {
          const trimmed = raw.trim();
          const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
          if (!username) return;

          Alert.alert(
            '친구 요청',
            `@${username} 님에게 친구 요청을 보내시겠어요?`,
            [
              { text: '취소', style: 'cancel' },
              {
                text: '보내기',
                onPress: async () => {
                  try {
                    const res = await api.post('/api/friends/requests', {
                      username,
                    });
                    const data = res.data?.data || {};
                    const targetName =
                      data.targetName || data.targetUsername || `@${username}`;
                    setShowAddFriend(false);
                    pushTimerToast(targetName, '친구 요청을 보냈어요');
                  } catch (error) {
                    console.error('[Timer][FriendRequest] API 실패', {
                      username,
                      status: error.response?.status,
                      message: error.response?.data?.message,
                    });
                    Alert.alert(
                      '친구 요청 실패',
                      error.response?.data?.message ||
                        '친구 요청 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요',
                    );
                  }
                },
              },
            ],
          );
        }}
      />
    </>
  );
};

// ── 화면 래퍼 ────────────────────────────────────────────
// 네비게이션/헤더/푸터를 감싸고 TimerContent 를 끼워 넣는 얇은 컴포넌트
const Timer = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize],
  );
  const goMainTab = useCallback(
    (tab) => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: tab } }],
        }),
      );
    },
    [navigation],
  );
  return (
    <SafeAreaView style={styles.safeAreaFlex} edges={['top', 'bottom']}>
      <MainHeader activeTab="timer" navigation={navigation} />
      <TimerContent />
      <MainFooter
        activeTab="timer"
        onTabPress={(tab) => {
          if (tab === 'board') goMainTab('board');
          if (tab === 'message') goMainTab('message');
          if (tab === 'school') goMainTab('school');
          if (tab === 'mypage') goMainTab('mypage');
        }}
      />
    </SafeAreaView>
  );
};

export default Timer;
