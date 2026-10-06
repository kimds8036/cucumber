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
import { View, Text, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ViewShot from 'react-native-view-shot';
import { colors } from '../../../styles/colors';
import {
  tdb,
  formatHMS,
  getSessionDurationMs,
} from './timerHelpers';
import TimerTimetable from './TimerTimetable';
import {
  TIMER_CAPTURE_WATERMARK,
  preloadTimerCaptureWatermark,
} from './timerCaptureWatermark';
import TimerCard from './TimerCard';
import TimerPlannerTabs from './TimerPlannerTabs';

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
  segment,
  plannerTab,
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
  onPomodoroMode,
  pauseTimer,
  startForSubject,
  pomoClockOn,
  pomoSkip,
  pomoResetClock,
  collapsedSubjects,
  toggleSubjectCollapsed,
  openAddTaskForSubject,
  setShowAddSubject,
  setTaskStatus,
  deleteSubject,
  deleteTask,
  onOpenDayRecord,
  weekly,
  streakDays,
  grassRefreshSec,
  onOpenSettings,
  registerGuideTarget = true,
}) {
  const liveExtraMs = useContext(LiveElapsedMsContext);
  const displayTotalMs = isViewingToday
    ? totalElapsedMs + (isRunning ? liveExtraMs : 0)
    : displayTotalElapsedMs;

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    return displaySessions
      .filter((s) => s.subjectId === subjectId)
      .reduce((sum, s) => {
        if (s.kind === 'break') return sum;
        const isActiveOpenSession =
          s.endedAtMs == null && isRunning && activeSubjectId === subjectId;
        if (isActiveOpenSession) return sum;
        return sum + getSessionDurationMs(s);
      }, 0);
  };

  if (segment === 'card') {
    return (
      <TimerCard
        styles={styles}
        normalize={normalize}
        displayTotalMs={displayTotalMs}
        isViewingToday={isViewingToday}
        isRunning={isRunning}
        selectedDayKey={selectedDayKey}
        goPrevDay={goPrevDay}
        goNextDay={goNextDay}
        canGoNextDay={canGoNextDay}
        setShowCalendar={setShowCalendar}
        handleSaveAsImage={handleSaveAsImage}
        onOpenStudyRoom={onOpenStudyRoom}
        toggleTimer={toggleTimer}
        onPomodoroMode={onPomodoroMode}
        onPomodoroSkip={pomoSkip}
        onPomodoroReset={pomoResetClock}
        weeklyRate={weekly?.rate ?? 0}
        streakDays={streakDays ?? 0}
        onOpenSettings={onOpenSettings}
        registerGuideTarget={registerGuideTarget}
      />
    );
  }

  return (
      <View style={[styles.todoTimetableRow, tdb('#BF5AF2')]}>
        <TimerPlannerTabs
          value={plannerTab}
          styles={styles}
          normalize={normalize}
          liveExtraMs={liveExtraMs}
          isViewingToday={isViewingToday}
          isRunning={isRunning}
          pomoClockOn={pomoClockOn}
          activeSubjectId={activeSubjectId}
          displaySessions={displaySessions}
          displaySubjects={displaySubjects}
          displayTasks={displayTasks}
          getSubjectTotalMs={getSubjectTotalMs}
          collapsedSubjects={collapsedSubjects}
          toggleSubjectCollapsed={toggleSubjectCollapsed}
          startForSubject={startForSubject}
          pauseTimer={pauseTimer}
          setShowAddSubject={setShowAddSubject}
          openAddTaskForSubject={openAddTaskForSubject}
          setTaskStatus={setTaskStatus}
          deleteSubject={deleteSubject}
          deleteTask={deleteTask}
          onOpenDayRecord={onOpenDayRecord}
          weekly={weekly}
          grassRefreshSec={grassRefreshSec}
          dayKey={selectedDayKey}
        />
      </View>
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
        if (s.kind === 'break') return sum;
        const isActiveOpenSession =
          s.endedAtMs == null && isRunning && activeSubjectId === subjectId;
        if (isActiveOpenSession) return sum;
        return sum + getSessionDurationMs(s);
      }, 0);
  };

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
                              color={colors.white}
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
                <TimerTimetable
                  styles={styles}
                  displaySessions={displaySessions}
                  displaySubjects={displaySubjects}
                  dayKey={selectedDayKey}
                  guideTarget={false}
                  showHint={false}
                  variant="capture"
                />
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
