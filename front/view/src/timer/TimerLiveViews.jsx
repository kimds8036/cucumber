/**
 * 타이머 라이브 UI — 타임테이블·투두·캡처 (1초 tick 격리)
 */
import React, {
  useState,
  useEffect,
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
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import ViewShot from 'react-native-view-shot';
import { colors } from '../../../styles/colors';
import { GuideFocusTarget } from '../../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../../src/screens/UserGuide/guideFocusTargets';
import {
  HOURS,
  tdb,
  formatHMS,
  lightenHex,
  getSecondsFromSixAM,
  getSessionDurationMs,
  toTimerDayTimelineSeconds,
  appendSessionSegmentsForSlot,
} from './timerHelpers';
import {
  TIMER_CAPTURE_WATERMARK,
  preloadTimerCaptureWatermark,
} from './timerCaptureWatermark';
import StudyGrassMap from '../../../components/studygrassmap';
import TimerWeeklyPane from './TimerWeeklyPane';
import { monthRangeYmd, shiftMonth } from '../../../utils/timerWeek';

const PANE_TABS = [
  { id: 'todo', label: '투두' },
  { id: 'timeline', label: '기록' },
  { id: 'grass', label: '잔디' },
  { id: 'weekly', label: '위클리' },
];

const LiveElapsedMsContext = createContext(0);

export function LiveElapsedTicker({
  isRunning,
  sessionStartedAtMs,
  resyncAt,
  isActive = true,
  children,
}) {
  const [liveExtraMs, setLiveExtraMs] = useState(0);

  const syncLiveExtra = useCallback(() => {
    if (!isActive || !isRunning || sessionStartedAtMs == null) {
      setLiveExtraMs(0);
      return;
    }
    setLiveExtraMs(Math.max(0, Date.now() - sessionStartedAtMs));
  }, [isActive, isRunning, sessionStartedAtMs]);

  useLayoutEffect(() => {
    syncLiveExtra();
  }, [syncLiveExtra, resyncAt]);

  useEffect(() => {
    if (!isActive || !isRunning || sessionStartedAtMs == null) return undefined;
    const t = setInterval(
      () =>
        setLiveExtraMs(Math.max(0, Date.now() - sessionStartedAtMs)),
      1000,
    );
    return () => clearInterval(t);
  }, [isActive, isRunning, sessionStartedAtMs, resyncAt]);

  return (
    <LiveElapsedMsContext.Provider value={liveExtraMs}>
      {children}
    </LiveElapsedMsContext.Provider>
  );
}

const TimerLiveScrollInnerComponent = function TimerLiveScrollInner({
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
  canGoNextDay,
  setShowCalendar,
  handleSaveAsImage,
  onOpenStudyRoom,
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
  onOpenSettings,
  streakDays = 0,
  weeklyRate = 0,
  grassDays = [],
  grassMonth,
  onGrassMonthChange,
  weeklyTasks = [],
  onAddWeeklyTask,
  onToggleWeeklyTask,
  onDeleteWeeklyTask,
}) {
  const liveExtraMs = useContext(LiveElapsedMsContext);
  const [activePane, setActivePane] = useState('todo');
  const todayTotalMs = totalElapsedMs + (isRunning ? liveExtraMs : 0);
  const displayTotalMs = isViewingToday
    ? todayTotalMs
    : displayTotalElapsedMs;
  const grassRange = grassMonth
    ? monthRangeYmd(grassMonth.year, grassMonth.month)
    : null;

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    return displaySessions
      .filter((s) => s.subjectId === subjectId)
      .reduce((sum, s) => {
        const isActiveOpenSession =
          s.endedAtMs == null && isRunning && activeSubjectId === subjectId;
        if (isActiveOpenSession) return sum;
        return sum + getSessionDurationMs(s);
      }, 0);
  };

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

  const renderTimetable = () =>
    HOURS.map((rowIndex) => {
      const hour = (6 + rowIndex) % 24;
      const slotStartBaseSeconds = ((hour - 6 + 24) % 24) * 3600;
      return (
        <View
          key={rowIndex}
          style={[styles.timetableRow, tdb('#708090')]}
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
      <GuideFocusTarget name={T.TIMER_TIMER_CARD} style={[styles.timerCard, tdb('#34C759')]}>
        <View style={styles.timerCardTop}>
          <TouchableOpacity
            style={styles.timerGearBtn}
            onPress={onOpenSettings}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="타이머 설정"
          >
            <Ionicons
              name="settings-outline"
              size={normalize(20)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.timerBlock, tdb('#5E5CE6')]}>
          <Text style={styles.timerTime}>{formatHMS(todayTotalMs)}</Text>
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
        </View>

        <View style={styles.timerStatsRow}>
          <TouchableOpacity
            style={[
              styles.timerStatCell,
              !isRunning && styles.timerStatCellDisabled,
            ]}
            onPress={onOpenStudyRoom}
            disabled={!isRunning}
            activeOpacity={0.85}
            accessibilityLabel="스터디룸 입장"
          >
            <Text style={styles.timerStatValue}>입장</Text>
            <Text style={styles.timerStatLabel}>스터디룸</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerStatCell}
            onPress={() => setActivePane('grass')}
            activeOpacity={0.85}
          >
            <Text style={styles.timerStatValue}>{Number(streakDays) || 0}일</Text>
            <Text style={styles.timerStatLabel}>연속 공부</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerStatCell}
            onPress={() => setActivePane('weekly')}
            activeOpacity={0.85}
          >
            <Text style={styles.timerStatValue}>{Number(weeklyRate) || 0}%</Text>
            <Text style={styles.timerStatLabel}>위클리</Text>
          </TouchableOpacity>
        </View>
      </GuideFocusTarget>

      <View style={[styles.paneRow, tdb('#BF5AF2')]}>
        <View style={styles.bookmarkRail}>
          {PANE_TABS.map((tab) => {
            const active = activePane === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.bookmarkTab, active && styles.bookmarkTabActive]}
                onPress={() => setActivePane(tab.id)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.bookmarkTabText,
                    active && styles.bookmarkTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.paneBody}>
          {activePane === 'todo' ? (
        <GuideFocusTarget name={T.TIMER_TODO_COLUMN} style={[styles.todoColumn, tdb('#FF2D55')]}>
          <View style={[styles.todoHeader, tdb('#64D2FF')]}>
            <View style={styles.dateBarLeft}>
              <TouchableOpacity
                onPress={goPrevDay}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.dateBarNavBtn}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={styles.dateBarDateTouch}
              >
                <Text style={styles.todoTitle}>
                  {selectedDayKey
                    ? selectedDayKey.replace(/-/g, '.')
                    : '투두리스트'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goNextDay}
                disabled={!canGoNextDay}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.dateBarNavBtn}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={canGoNextDay ? colors.textPrimary : colors.textLight20}
                />
              </TouchableOpacity>
            </View>
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
            style={[styles.todoList, tdb('#AC8E68')]}
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
                <View
                  key={sub.id}
                  style={[styles.subjectAccordionWrap, tdb('#FF6B35')]}
                >
                  <View
                    style={[
                      styles.subjectBlock,
                      { backgroundColor: lightenHex(sub.color, 0.9) },
                      tdb('#7B68EE'),
                    ]}
                  >
                    <TouchableOpacity
                      style={[styles.subjectRow, tdb('#20B2AA')]}
                      activeOpacity={1}
                      onLongPress={() => deleteSubject?.(sub)}
                      delayLongPress={350}
                      disabled={!isViewingToday}
                    >
                      <View style={[styles.subjectBody, tdb('#DA70D6')]}>
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
                      <View style={[styles.subjectTasksArea, tdb('#9ACD32')]}>
                        {subTasks.map((task) => (
                          <TouchableOpacity
                            key={task.id}
                            style={[styles.taskRow, tdb('#2E8B57')]}
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
                                task.status === 'done' &&
                                  styles.taskContentDone,
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
                            + 할 일 추가
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </GuideFocusTarget>
          ) : null}

          {activePane === 'timeline' ? (
        <GuideFocusTarget
          name={T.TIMER_TIMETABLE_COLUMN}
          style={[styles.timetableColumn, tdb('#4682B4')]}
        >
          <View style={styles.timetableTitleRow}>
            <Text style={styles.timetableTitle}>공부 타임라인</Text>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveAsImage}
              accessibilityLabel="플래너 다운로드"
            >
              <Feather name="download" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.timetableScroll, tdb('#CD853F')]}>
            {renderTimetable()}
          </View>
        </GuideFocusTarget>
          ) : null}

          {activePane === 'grass' ? (
            <View style={styles.todoColumn}>
              <View style={styles.grassPaneHeader}>
                <TouchableOpacity
                  onPress={() =>
                    grassMonth &&
                    onGrassMonthChange?.(
                      shiftMonth(grassMonth.year, grassMonth.month, -1),
                    )
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.grassPaneTitle}>
                  {grassMonth
                    ? `${grassMonth.year}.${String(grassMonth.month).padStart(2, '0')}`
                    : '공부 잔디'}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    grassMonth &&
                    onGrassMonthChange?.(
                      shiftMonth(grassMonth.year, grassMonth.month, 1),
                    )
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
              <StudyGrassMap
                days={grassDays}
                rangeStart={grassRange?.start}
                rangeEnd={grassRange?.end}
              />
            </View>
          ) : null}

          {activePane === 'weekly' ? (
            <TimerWeeklyPane
              styles={styles}
              normalize={normalize}
              tasks={weeklyTasks}
              onAdd={onAddWeeklyTask}
              onToggle={onToggleWeeklyTask}
              onDelete={onDeleteWeeklyTask}
            />
          ) : null}
        </View>
      </View>
    </>
  );
}

export const TimerLiveScrollInner = React.memo(TimerLiveScrollInnerComponent);

export function TimerLivePlannerCapture({
  capturePlannerRef,
  styles,
  normalize,
  isViewingToday,
  isRunning,
  activeSubjectId,
  totalElapsedMs,
  displayTotalElapsedMs,
  displaySessions,
  displaySubjects,
  displayTasks,
  selectedDayKey,
  onWatermarkLoad,
}) {
  const liveExtraMs = useContext(LiveElapsedMsContext);
  const displayTotalMs = isViewingToday
    ? totalElapsedMs + (isRunning ? liveExtraMs : 0)
    : displayTotalElapsedMs;

  useEffect(() => {
    preloadTimerCaptureWatermark().catch(() => null);
  }, []);

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    return displaySessions
      .filter((s) => s.subjectId === subjectId)
      .reduce((sum, s) => {
        const isActiveOpenSession =
          s.endedAtMs == null && isRunning && activeSubjectId === subjectId;
        if (isActiveOpenSession) return sum;
        return sum + getSessionDurationMs(s);
      }, 0);
  };

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

  const renderTimetable = () =>
    HOURS.map((rowIndex) => {
      const hour = (6 + rowIndex) % 24;
      const slotStartBaseSeconds = ((hour - 6 + 24) % 24) * 3600;
      return (
        <View
          key={rowIndex}
          style={[styles.timetableRow, tdb('#708090')]}
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
      style={[styles.plannerCaptureOffscreen, tdb('#A0522D')]}
      pointerEvents="none"
      collapsable={false}
    >
      <ViewShot
        ref={capturePlannerRef}
        options={{ format: 'png', quality: 1 }}
        style={[styles.viewShotBg, tdb('#8B7355')]}
        collapsable={false}
      >
        <View
          style={[styles.plannerCaptureWrap, tdb('#6B8E23')]}
          collapsable={false}
        >
          <View style={[styles.plannerCaptureRow, tdb('#483D8B')]}>
            <View style={[styles.plannerLeftColumn, tdb('#008B8B')]}>
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
            <View style={[styles.plannerRightColumn, tdb('#B22222')]}>
              <View style={[styles.timetableScroll, tdb('#CD853F')]}>
                {renderTimetable()}
              </View>
            </View>
          </View>
          <View
            style={styles.captureWatermarkOverlay}
            pointerEvents="none"
            collapsable={false}
          >
            <Image
              source={TIMER_CAPTURE_WATERMARK}
              style={styles.captureWatermarkImage}
              resizeMode="contain"
              fadeDuration={0}
              onLoad={onWatermarkLoad}
            />
          </View>
        </View>
      </ViewShot>
    </View>
  );
}
