/**
 * 타이머 일(day) 상태 — 로드/저장/세션 제어/날짜 롤오버
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { api } from '../../../utils/api';
import {
  getTimerDayKey,
  saveDayToDb,
  getPreviousDayKey,
  getNextDayKey,
  loadDayFromDb,
  timerDayBoundaryMs,
} from '../../../utils/timerStorage';
import { getGuideTimerDayPayload } from '../../../src/screens/UserGuide/guidePreviewData';
import { cancelTimerRunningNotification } from '../../../utils/timerRunNotification';
import {
  getTimerRuntimeState,
  registerTimerStopHandler,
  setTimerRuntimeState,
  TIMER_COUNTDOWN_TOTAL_SECONDS,
} from '../../../utils/timerRuntimeStore';
import {
  DEFAULT_SUBJECTS,
  DEFAULT_TASKS,
  TIMETABLE_GRAY,
  TIMER_HEARTBEAT_MS,
  TIMER_BACKGROUND_AUTO_CLOSE_MS,
  TIMER_RECOVER_OPEN_SESSION_MAX_SECONDS,
  TIMER_RUNNING_AUTOSAVE_INTERVAL_MS,
  buildSnapshotCompleteSessions,
  dateFromDayKey,
  getOpenSession,
  getOpenSessionStartedAtMs,
  getPayloadSignature,
  getPersistPayloadSignature,
  getSecondsFromSixAM,
  injectSubjectSnapshotsIntoSessions,
  normalizeClockSeconds,
  normalizeDayPayload,
  sessionToDerivedTimelineSeconds,
} from './timerHelpers';
import {
  getTimerSettings,
  loadTimerSettings,
  timerSettingsToPomodoroConfig,
  updateTimerSettings,
} from './timerSettingsStorage';
import {
  getPomodoroView,
  pomodoroPause,
  pomodoroReset,
  pomodoroResume,
  pomodoroSkip,
  pomodoroStart,
  subscribePomodoro,
} from '../../../utils/pomodoroRuntimeStore';
import {
  getPhaseEndNotice,
  publishPhaseEndNotice,
  subscribePhaseEndNotice,
} from './phaseEndNoticeStore';
import { playPhaseEndSound, vibratePhaseEnd } from './phaseEndCue';
import { registerPomodoroRoomActions } from './pomodoroRoomBridge';
import { appAlert } from '../../../utils/appAlert';

export function useTimerDay({
  isGuidePreview,
  isFocused,
  emitTimerStatus,
  pushTimerToast,
}) {
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [sessions, setSessions] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pomoClockOn, setPomoClockOn] = useState(false);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [liveElapsedResyncAt, setLiveElapsedResyncAt] = useState(0);

  const bumpLiveElapsedResync = useCallback(() => {
    setLiveElapsedResyncAt(Date.now());
  }, []);

  const openSessionStartedAtMs = useMemo(() => {
    if (!isRunning) return null;
    return getOpenSessionStartedAtMs(sessions);
  }, [isRunning, sessions]);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskSubjectId, setAddTaskSubjectId] = useState(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const [timerDayKey, setTimerDayKey] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const prevIsRunningRef = useRef(false);
  const isRunningRef = useRef(false);
  isRunningRef.current = isRunning;
  const appStateRef = useRef(AppState.currentState);
  const backgroundEnteredAtRef = useRef(null);
  const wasRunningOnBackgroundRef = useRef(false);
  const backgroundDayKeyRef = useRef(null);
  const closeIncompleteLockRef = useRef(false);
  const rolloverLockRef = useRef(false);
  const pendingImmediatePersistReasonRef = useRef(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [viewState, setViewState] = useState(null);
  const [isDayLoading, setIsDayLoading] = useState(false);
  const dayLoadRequestRef = useRef(0);
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

  useEffect(() => {
    latestSnapshotRef.current = {
      timerDayKey,
      sessions,
      totalElapsedMs,
      subjects,
      tasks,
      activeSubjectId,
      isViewingToday: selectedDayKey === todayKey,
    };
  }, [timerDayKey, sessions, totalElapsedMs, subjects, tasks, activeSubjectId, selectedDayKey, todayKey]);

  const persistTimerSnapshot = useCallback(
    (reason, override = null) => {
      if (isGuidePreview) return Promise.resolve(false);
      const snapshot = override ?? latestSnapshotRef.current;
      const dayKey = snapshot?.timerDayKey;
      if (!dayKey) return Promise.resolve(false);
      const snapshotSessions = buildSnapshotCompleteSessions(
        snapshot?.sessions ?? [],
        snapshot?.subjects ?? [],
        snapshot?.timerDayKey,
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
    [isGuidePreview],
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
        const prevSessions = injectSubjectSnapshotsIntoSessions(
          snapshot?.sessions ?? [],
          prevSubjects,
        );
        const activeMeta =
          activeSubjectId == null
            ? null
            : prevSubjects.find(
                (s) => Number(s?.id) === Number(activeSubjectId),
              ) || null;

        const nextAnchorMs = timerDayBoundaryMs(nextDayKey);
        const closedPrevSessions = (() => {
          const next = [...prevSessions];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i]?.endedAtMs == null) {
              next[i] = {
                ...next[i],
                endedAtMs: Number.isFinite(nextAnchorMs)
                  ? nextAnchorMs
                  : Date.now(),
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
            startedAtMs: Number.isFinite(nextAnchorMs)
              ? nextAnchorMs
              : Date.now(),
            endedAtMs: null,
          },
        ]);
      } finally {
        rolloverLockRef.current = false;
      }
    },
    [activeSubjectId, persistTimerSnapshot],
  );

  const loadDayData = async (dayKey) => {
    if (dayKey > todayKey) return null;
    return loadDayFromDb(dayKey);
  };

  useEffect(() => {
    let mounted = true;
    const applyDayPayload = (data, dayKey) => {
      if (!mounted) return;
      const normalized =
        data != null
          ? data
          : normalizeDayPayload(
              { sessions: [], subjects: [], tasks: [], totalElapsedMs: 0 },
              dayKey,
            );
      baselineSignatureRef.current = getPersistPayloadSignature({
        timerDayKey: dayKey,
        sessions: normalized.sessions,
        totalElapsedMs: normalized.totalElapsedMs,
        subjects: normalized.subjects,
        tasks: normalized.tasks,
      });
      setTimerDayKey(dayKey);
      setSelectedDayKey(dayKey);
      if (data != null) {
        const loadedSessions = normalized.sessions;
        setSessions(loadedSessions);
        setTotalElapsedMs(normalized.totalElapsedMs);
        setSubjects(normalized.subjects);
        setTasks(normalized.tasks);

        let openSession = null;
        for (let i = loadedSessions.length - 1; i >= 0; i -= 1) {
          if (loadedSessions[i].endedAtMs == null) {
            openSession = loadedSessions[i];
            break;
          }
        }
        if (openSession) {
          const startMs = Number(openSession.startedAtMs);
          const elapsedMs = Math.max(0, Date.now() - startMs);
          const isGhostOpenSession =
            elapsedMs > TIMER_RECOVER_OPEN_SESSION_MAX_SECONDS * 1000;

          if (isGhostOpenSession) {
            setIsRunning(false);
            setActiveSubjectId(null);
          } else {
            setIsRunning(true);
            setActiveSubjectId(
              openSession.subjectId != null ? openSession.subjectId : null,
            );
          }
        } else {
          setIsRunning(false);
          setActiveSubjectId(null);
        }
      }
      setInitialLoadDone(true);
    };

    if (isGuidePreview) {
      const guide = getGuideTimerDayPayload();
      const normalized = normalizeDayPayload(
        {
          sessions: guide.sessions,
          subjects: guide.subjects,
          tasks: guide.tasks,
          totalElapsedMs: guide.totalElapsedMs,
        },
        guide.dayKey,
      );
      applyDayPayload(normalized, guide.dayKey);
      return () => {
        mounted = false;
      };
    }

    const dayKey = getTimerDayKey(new Date());
    loadDayFromDb(dayKey).then((data) => {
      if (mounted) applyDayPayload(data, dayKey);
    });
    return () => {
      mounted = false;
    };
  }, [isGuidePreview]);

  useEffect(() => {
    if (isGuidePreview) return;
    if (!initialLoadDone || selectedDayKey == null) return;
    if (selectedDayKey === todayKey) {
      setViewState(null);
      setIsDayLoading(false);
      return;
    }

    const requestId = ++dayLoadRequestRef.current;
    let mounted = true;
    const requestDayKey = selectedDayKey;

    setIsDayLoading(true);
    setViewState(null);

    loadDayData(requestDayKey).then((data) => {
      if (!mounted || requestId !== dayLoadRequestRef.current) return;
      const nextView = data
        ? {
            sessions: data.sessions ?? [],
            totalElapsedMs: data.totalElapsedMs ?? 0,
            subjects: data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS,
            tasks: data.tasks?.length ? data.tasks : DEFAULT_TASKS,
          }
        : {
            sessions: [],
            totalElapsedMs: 0,
            subjects: DEFAULT_SUBJECTS,
            tasks: DEFAULT_TASKS,
          };
      setViewState(nextView);
      setIsDayLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [selectedDayKey, todayKey, initialLoadDone, isGuidePreview]);

  useEffect(() => {
    if (isGuidePreview) {
      pendingImmediatePersistReasonRef.current = null;
      return;
    }
    if (
      !initialLoadDone ||
      timerDayKey == null ||
      selectedDayKey !== todayKey
    ) {
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
    isGuidePreview,
  ]);

  useEffect(() => {
    if (
      !initialLoadDone ||
      timerDayKey == null ||
      selectedDayKey !== todayKey
    ) {
      return undefined;
    }
    if (!isRunning) return undefined;
    const autosaveInterval = setInterval(() => {
      const currentSig = getPersistPayloadSignature(latestSnapshotRef.current);
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
    if (isGuidePreview) return undefined;
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
    isGuidePreview,
    persistTimerSnapshot,
  ]);

  const endCurrentSession = () => {
    const startedAtMs = getOpenSessionStartedAtMs(
      latestSnapshotRef.current?.sessions ?? [],
    );
    if (startedAtMs == null) return 0;
    const duration = Math.max(0, Date.now() - startedAtMs);
    setTotalElapsedMs((prev) => prev + duration);
    return duration;
  };

  const closeOpenSession = (subjectId) =>
    setSessions((prev) => {
      const next = [...prev];
      const endedAtMs = Date.now();
      let closed = false;
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].subjectId === subjectId && next[i].endedAtMs == null) {
          next[i] = {
            ...next[i],
            endedAtMs,
          };
          closed = true;
          break;
        }
      }
      if (!closed) {
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].endedAtMs == null) {
            next[i] = {
              ...next[i],
              endedAtMs,
            };
            break;
          }
        }
      }
      return next;
    });

  const pomoOnToday = () => {
    const snap = latestSnapshotRef.current;
    return getTimerSettings().pomodoroOn === true && snap?.isViewingToday === true;
  };

  const writeSnapshot = (patch) => {
    latestSnapshotRef.current = { ...latestSnapshotRef.current, ...patch };
  };

  const subjectMeta = (subjectId) => {
    if (subjectId == null) return { subjectName: null, subjectColor: null };
    const found = (latestSnapshotRef.current?.subjects || []).find(
      (s) => s.id === subjectId,
    );
    return {
      subjectName: found?.name ?? null,
      subjectColor: found?.color ?? null,
    };
  };

  const finishOpenInterval = (countAsStudy, options = {}) => {
    const keepPresence = options.keepPresence === true;
    const snap = latestSnapshotRef.current;
    const sessionsNow = snap?.sessions ?? [];
    const open = getOpenSession(sessionsNow);
    if (!open) {
      setIsRunning(false);
      if (!keepPresence) setPomoClockOn(false);
      return;
    }
    const endedAtMs = Date.now();
    const nextSessions = sessionsNow.map((session) =>
      session === open || (session.endedAtMs == null && session.startedAtMs === open.startedAtMs)
        ? { ...session, endedAtMs }
        : session,
    );
    const addMs =
      countAsStudy && open.kind !== 'break'
        ? Math.max(0, endedAtMs - Number(open.startedAtMs || endedAtMs))
        : 0;
    const nextTotal = (snap.totalElapsedMs || 0) + addMs;
    writeSnapshot({ sessions: nextSessions, totalElapsedMs: nextTotal });
    setSessions(nextSessions);
    if (addMs > 0) setTotalElapsedMs(nextTotal);
    setIsRunning(false);
    if (!keepPresence) setPomoClockOn(false);
    requestImmediatePersist('pomo-close');
    if (!keepPresence) emitTimerStatus('idle');
  };

  const openPomoInterval = (phase, subjectId) => {
    const kind = phase === 'focus' ? 'study' : 'break';
    const meta = subjectMeta(subjectId);
    const startWall = Date.now();
    const nextSessions = [
      ...(latestSnapshotRef.current?.sessions ?? []),
      {
        subjectId: subjectId ?? null,
        subjectName: meta.subjectName,
        subjectColor: meta.subjectColor,
        kind,
        startedAtMs: startWall,
        endedAtMs: null,
      },
    ];
    writeSnapshot({
      sessions: nextSessions,
      activeSubjectId: subjectId ?? null,
    });
    setActiveSubjectId(subjectId ?? null);
    setSessions(nextSessions);
    setIsRunning(kind === 'study');
    setPomoClockOn(true);
    if (kind === 'study') {
      emitTimerStatus('studying', {
        dayKey: latestSnapshotRef.current?.timerDayKey ?? getTimerDayKey(new Date()),
        subjectId: subjectId ?? null,
        subjectName: meta.subjectName,
        startSeconds: normalizeClockSeconds(getSecondsFromSixAM(new Date()), 0),
      });
    }
    requestImmediatePersist('pomo-open');
  };

  const dropOpenInterval = () => {
    const sessionsNow = latestSnapshotRef.current?.sessions ?? [];
    const nextSessions = sessionsNow.filter((session) => session.endedAtMs != null);
    writeSnapshot({ sessions: nextSessions });
    setSessions(nextSessions);
    setIsRunning(false);
    setPomoClockOn(false);
    requestImmediatePersist('pomo-reset');
    emitTimerStatus('idle');
  };

  const pausePomoClock = () => {
    const view = getPomodoroView();
    if (view.status !== 'running') return;
    const phase = view.phase;
    pomodoroPause();
    finishOpenInterval(phase === 'focus');
  };

  const resumeOrStartPomo = (subjectId) => {
    const open = getOpenSession(latestSnapshotRef.current?.sessions ?? []);
    if (open) finishOpenInterval(open.kind !== 'break');
    const view = getPomodoroView();
    if (view.status === 'paused') pomodoroResume();
    else if (view.status !== 'running') pomodoroStart();
    const next = getPomodoroView();
    openPomoInterval(next.phase, subjectId);
  };

  const stopOpenStudyRecord = () => {
    const open = getOpenSession(latestSnapshotRef.current?.sessions ?? []);
    if (!open && !isRunningRef.current) return false;
    if (open && open.kind !== 'break') endCurrentSession();
    closeOpenSession(open?.subjectId ?? latestSnapshotRef.current?.activeSubjectId ?? null);
    setIsRunning(false);
    setPomoClockOn(false);
    requestImmediatePersist('pause');
    emitTimerStatus('idle');
    return true;
  };

  const pauseTimer = useCallback(() => {
    const view = getPomodoroView();
    if (pomoOnToday() && view.status === 'running') {
      pausePomoClock();
      return;
    }
    stopOpenStudyRecord();
  }, [requestImmediatePersist, emitTimerStatus]);

  const startForSubject = (subjectId) => {
    if (pomoOnToday()) {
      const view = getPomodoroView();
      const currentId = latestSnapshotRef.current?.activeSubjectId;
      if (view.status === 'running' && currentId === subjectId) {
        pausePomoClock();
        return;
      }
      if (view.status === 'running') {
        finishOpenInterval(view.phase === 'focus');
        openPomoInterval(view.phase, subjectId);
        return;
      }
      resumeOrStartPomo(subjectId);
      return;
    }
    if (isRunning && activeSubjectId === subjectId) return;
    const openBeforeStart = getOpenSession(latestSnapshotRef.current?.sessions ?? []);
    if (isRunning || openBeforeStart) {
      if (!openBeforeStart || openBeforeStart.kind !== 'break') endCurrentSession();
      closeOpenSession(openBeforeStart?.subjectId ?? activeSubjectId);
      requestImmediatePersist('subject-switch');
    }
    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const subjectName = selectedSubject?.name ?? null;
    const subjectColor = selectedSubject?.color ?? null;
    const nowSecForFriends = normalizeClockSeconds(
      getSecondsFromSixAM(new Date()),
      0,
    );
    const startWall = Date.now();
    setActiveSubjectId(subjectId);
    setIsRunning(true);
    setSessions((prev) => [
      ...prev,
      {
        subjectId,
        subjectName,
        subjectColor,
        startedAtMs: startWall,
        endedAtMs: null,
      },
    ]);
    emitTimerStatus('studying', {
      dayKey: timerDayKey ?? getTimerDayKey(new Date()),
      subjectId,
      subjectName,
      startSeconds: nowSecForFriends,
    });
    requestImmediatePersist('timer-start');
  };

  const startTimerTop = () => {
    if (isRunning && activeSubjectId === null) return;
    const open = getOpenSession(latestSnapshotRef.current?.sessions ?? []);
    if (isRunning || open) {
      if (!open || open.kind !== 'break') endCurrentSession();
      closeOpenSession(open?.subjectId ?? activeSubjectId);
      requestImmediatePersist('subject-switch');
    }
    const nowSecForFriends = normalizeClockSeconds(
      getSecondsFromSixAM(new Date()),
      0,
    );
    const startWall = Date.now();
    setActiveSubjectId(null);
    setIsRunning(true);
    setSessions((prev) => [
      ...prev,
      {
        subjectId: null,
        subjectName: null,
        subjectColor: null,
        startedAtMs: startWall,
        endedAtMs: null,
      },
    ]);
    emitTimerStatus('studying', {
      dayKey: timerDayKey ?? getTimerDayKey(new Date()),
      subjectId: null,
      subjectName: null,
      startSeconds: nowSecForFriends,
    });
    requestImmediatePersist('timer-start');
  };

  const pomoPrimary = () => {
    const view = getPomodoroView();
    const subjectId = latestSnapshotRef.current?.activeSubjectId ?? null;
    if (view.status === 'running') {
      pausePomoClock();
      return;
    }
    resumeOrStartPomo(subjectId);
  };

  const pomoSkip = () => {
    pomodoroSkip();
  };

  const pomoResetClock = () => {
    dropOpenInterval();
    pomodoroReset(timerSettingsToPomodoroConfig(getTimerSettings()));
  };

  const announceStudying = (subjectId) => {
    const meta = subjectMeta(subjectId);
    emitTimerStatus('studying', {
      dayKey: latestSnapshotRef.current?.timerDayKey ?? getTimerDayKey(new Date()),
      subjectId: subjectId ?? null,
      subjectName: meta.subjectName,
      startSeconds: normalizeClockSeconds(getSecondsFromSixAM(new Date()), 0),
    });
  };

  const setPomodoroMode = (nextOn) => {
    const enable = nextOn === true;
    if (getTimerSettings().pomodoroOn === enable) return;
    updateTimerSettings({ pomodoroOn: enable });
    if (enable) {
      const cue = getTimerSettings().phaseEndCue || 'popup';
      if (cue === 'sound' || cue === 'vibrate') {
        const modeLabel = cue === 'sound' ? '소리' : '진동';
        appAlert.alert(
          '사용 안내',
          `뽀모도로로 전환했어요.\n지금은 ${modeLabel} 모드예요.\n독서실이나 공공장소에서는 주의해 주세요.`,
          undefined,
          { emphasis: ['뽀모도로', modeLabel] },
        );
      } else if (cue === 'none') {
        appAlert.alert(
          '사용 안내',
          '뽀모도로로 전환했어요.\n끝나면 따로 알리지 않아요.',
          undefined,
          { emphasis: ['뽀모도로'] },
        );
      } else {
        appAlert.alert(
          '사용 안내',
          '뽀모도로로 전환했어요.\n끝나면 팝업으로 알려줘요.',
          undefined,
          { emphasis: ['뽀모도로', '팝업'] },
        );
      }
    }

    const open = getOpenSession(latestSnapshotRef.current?.sessions ?? []);
    const view = getPomodoroView();
    const studyOpen = Boolean(
      isRunningRef.current && open && open.kind !== 'break',
    );
    const subjectId = open?.subjectId ?? latestSnapshotRef.current?.activeSubjectId ?? null;

    if (enable) {
      if (!studyOpen) return;
      const config = timerSettingsToPomodoroConfig(getTimerSettings());
      pomodoroReset(config);
      pomodoroStart();
      setPomoClockOn(true);
      if (subjectId !== latestSnapshotRef.current?.activeSubjectId) {
        setActiveSubjectId(subjectId ?? null);
        writeSnapshot({ activeSubjectId: subjectId ?? null });
      }
      announceStudying(subjectId);
      return;
    }

    if (view.phase !== 'focus' && (view.status === 'running' || open?.kind === 'break')) {
      if (view.status === 'running') pomodoroPause();
      finishOpenInterval(false);
      pomodoroReset(timerSettingsToPomodoroConfig(getTimerSettings()));
      return;
    }
    if (view.status === 'running') pomodoroPause();
    if (studyOpen) {
      setPomoClockOn(false);
      return;
    }
    setPomoClockOn(false);
  };

  const [phaseEndNotice, setPhaseEndNotice] = useState(() => getPhaseEndNotice());
  const dismissPhaseEndNotice = useCallback(() => {
    publishPhaseEndNotice(null);
  }, []);

  useEffect(() => subscribePhaseEndNotice(setPhaseEndNotice), []);

  const pomoBridgeRef = useRef({});
  pomoBridgeRef.current = { pomoOnToday, finishOpenInterval, openPomoInterval };

  useEffect(
    () =>
      subscribePomodoro(async (view, events) => {
        const bridge = pomoBridgeRef.current;
        if (!bridge.pomoOnToday?.()) return;
        const ended = (events || []).find(
          (event) =>
            event.type === 'phase_complete' || event.type === 'phase_skip',
        );
        if (!ended) return;
        if (ended.type === 'phase_complete') {
          const settings = await loadTimerSettings();
          const cue = settings.phaseEndCue || 'popup';
          const notice = {
            endedPhase: ended.phase,
            nextPhase: view.phase,
          };
          if (cue === 'vibrate') vibratePhaseEnd();
          else if (cue === 'sound') playPhaseEndSound(notice);
          else if (cue !== 'none') publishPhaseEndNotice(notice);
        }
        // 자동 시작이 켜져 다음 단계가 바로 돌면 방에 남긴다.
        // 꺼져 있으면 알림 뒤에 출석을 끊고 스터디룸에서 나간다.
        const stayInRoom = view.status === 'running';
        bridge.finishOpenInterval(ended.phase === 'focus', {
          keepPresence: stayInRoom,
        });
        if (stayInRoom) {
          bridge.openPomoInterval(
            view.phase,
            latestSnapshotRef.current?.activeSubjectId ?? null,
          );
        }
      }),
    [],
  );

  const toggleTimer = () => {
    if (pomoOnToday()) {
      pomoPrimary();
      return;
    }
    return isRunning ? pauseTimer() : startTimerTop();
  };

  const pomoRoomActionsRef = useRef({ toggle: toggleTimer, skip: pomoSkip });
  pomoRoomActionsRef.current.toggle = toggleTimer;
  pomoRoomActionsRef.current.skip = pomoSkip;

  useEffect(() => {
    return registerPomodoroRoomActions({
      toggle: () => pomoRoomActionsRef.current.toggle(),
      skip: () => pomoRoomActionsRef.current.skip(),
    });
  }, []);

  const reloadTodayFromServer = useCallback(async () => {
    const dayKey = timerDayKey ?? getTimerDayKey(new Date());
    const data = await loadDayFromDb(dayKey);
    if (data == null) return;
    setSessions(data.sessions ?? []);
    setTotalElapsedMs(data.totalElapsedMs ?? 0);
    setSubjects(data.subjects ?? []);
    setTasks(data.tasks ?? []);
  }, [timerDayKey]);

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

  const isViewingToday = selectedDayKey === todayKey;

  const deleteSubject = useCallback(
    (subject) => {
      if (!isViewingToday || !subject?.id) return;
      const isDeletingActiveSubject = activeSubjectId === subject.id;
      const alertMessage =
        isDeletingActiveSubject && isRunning
          ? '과목을 삭제하시겠습니까? 관련 할 일도 삭제되지만, 공부 기록은 보존됩니다.\n\n현재 측정 중인 과목입니다. 삭제 시 타이머가 일시정지됩니다.'
          : '과목을 삭제하시겠습니까? 관련 할 일도 삭제되지만, 공부 기록은 보존됩니다.';
      Alert.alert('과목 삭제', alertMessage, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/timer/subjects/${subject.id}`);
              setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
              setTasks((prev) =>
                prev.filter((t) => t.subjectId !== subject.id),
              );
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
      ]);
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
    if (!isRunning && !pomoClockOn) return undefined;
    const ping = () => {
      api.post('/api/timer/heartbeat').catch((error) => {
        console.warn('[Timer] heartbeat 실패', error?.message || error);
      });
      emitTimerStatus('heartbeat');
    };
    ping();
    const heartbeatInterval = setInterval(ping, TIMER_HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isRunning, pomoClockOn, emitTimerStatus]);

  useEffect(() => {
    const tag = 'youth-paper-timer';
    // 뽀모도로 휴식은 isRunning 이 꺼져 있다. 시계가 돌아가는 동안은 화면을 유지한다.
    const clockOn = isRunning || pomoClockOn;
    if (!isFocused || !clockOn) {
      deactivateKeepAwake(tag);
      return undefined;
    }
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag);
    };
  }, [isRunning, pomoClockOn, isFocused]);

  useEffect(() => {
    prevIsRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    return () => {
      persistTimerSnapshot('unmount-flush');
    };
  }, [persistTimerSnapshot]);

  useEffect(() => {
    setTimerRuntimeState({ totalElapsedMs });
  }, [totalElapsedMs]);

  useEffect(() => {
    if (!isFocused || !isRunning || openSessionStartedAtMs == null) {
      if (!isRunning || openSessionStartedAtMs == null) {
        setTimerRuntimeState({
          isRunning: false,
          startTimestamp: null,
          countdownBaseTimestamp: null,
          countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
          countdownTotalSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
        });
        cancelTimerRunningNotification();
      }
      return undefined;
    }

    const syncRuntimeCountdown = () => {
      const runtimeState = getTimerRuntimeState();
      const runtimeBase = Number(runtimeState?.countdownBaseTimestamp);
      const countdownBaseTimestamp =
        Number.isFinite(runtimeBase) && runtimeBase > 0
          ? runtimeBase
          : openSessionStartedAtMs;
      const elapsedSec = Math.floor(
        (Date.now() - countdownBaseTimestamp) / 1000,
      );
      const remainingSec = Math.max(
        0,
        TIMER_COUNTDOWN_TOTAL_SECONDS - elapsedSec,
      );
      setTimerRuntimeState({
        isRunning: true,
        startTimestamp: openSessionStartedAtMs,
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
  }, [isRunning, openSessionStartedAtMs, pauseTimer, isFocused]);

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
        if (
          getOpenSessionStartedAtMs(latestSnapshotRef.current?.sessions ?? []) !=
          null
        ) {
          bumpLiveElapsedResync();
        }
      } else if (nextState === 'active') {
        cancelTimerRunningNotification();
        if (
          getOpenSessionStartedAtMs(latestSnapshotRef.current?.sessions ?? []) !=
          null
        ) {
          bumpLiveElapsedResync();
        }
      }
    });
    return () => sub.remove();
  }, [
    isRunning,
    activeSubjectId,
    emitTimerStatus,
    timerDayKey,
    persistTimerSnapshot,
    performTimerDayRollover,
    bumpLiveElapsedResync,
    pushTimerToast,
  ]);

  const goPrevDay = () => {
    if (!selectedDayKey) return;
    setSelectedDayKey(getPreviousDayKey(dateFromDayKey(selectedDayKey)));
  };

  const goNextDay = () => {
    if (!selectedDayKey) return;
    const nextKey = getNextDayKey(dateFromDayKey(selectedDayKey));
    if (nextKey > todayKey) return;
    setSelectedDayKey(nextKey);
  };

  const selectDayKey = useCallback(
    (dayKey) => {
      if (!dayKey || dayKey > todayKey) return;
      setSelectedDayKey(dayKey);
    },
    [todayKey],
  );

  const canGoNextDay =
    selectedDayKey != null && selectedDayKey < todayKey;

  const toggleSubjectCollapsed = (subjectId) =>
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));

  const openAddTaskForSubject = (subjectId) => {
    setAddTaskSubjectId(subjectId);
    setShowAddTask(true);
  };

  const displaySessions = isViewingToday
    ? sessions
    : (viewState?.sessions ?? []);

  const displaySessionsForTimetable = useMemo(() => {
    if (!selectedDayKey) return [];
    return displaySessions
      .map((s) => sessionToDerivedTimelineSeconds(s, selectedDayKey))
      .filter(Boolean);
  }, [displaySessions, selectedDayKey]);

  const displayTotalElapsedMs = isViewingToday
    ? totalElapsedMs
    : (viewState?.totalElapsedMs ?? 0);

  const displayTasks = isViewingToday
    ? tasks
    : (viewState?.tasks ?? DEFAULT_TASKS);

  const effectiveDisplaySubjects = useMemo(() => {
    const map = new Map();
    const displaySubjects = isViewingToday
      ? subjects
      : (viewState?.subjects ?? DEFAULT_SUBJECTS);
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
  }, [subjects, viewState, isViewingToday, displaySessions]);

  return {
    subjects,
    tasks,
    isRunning,
    pomoClockOn,
    activeSubjectId,
    totalElapsedMs,
    liveElapsedResyncAt,
    openSessionStartedAtMs,
    bumpLiveElapsedResync,
    isRunningRef,
    showAddSubject,
    setShowAddSubject,
    showAddTask,
    setShowAddTask,
    addTaskSubjectId,
    setAddTaskSubjectId,
    collapsedSubjects,
    initialLoadDone,
    isDayLoading,
    selectedDayKey,
    setSelectedDayKey: selectDayKey,
    canGoNextDay,
    capturePlannerRef,
    showCalendar,
    setShowCalendar,
    isViewingToday,
    displaySessionsForTimetable,
    displayTotalElapsedMs,
    displayTasks,
    effectiveDisplaySubjects,
    addSubject,
    addTask,
    setTaskStatus,
    deleteSubject,
    deleteTask,
    startForSubject,
    pauseTimer,
    toggleTimer,
    setPomodoroMode,
    pomoSkip,
    pomoResetClock,
    phaseEndNotice,
    dismissPhaseEndNotice,
    goPrevDay,
    goNextDay,
    toggleSubjectCollapsed,
    openAddTaskForSubject,
  };
}
