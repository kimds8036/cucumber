/**
 * timer.jsx
 * - 타이머 + 투두리스트 + 타임테이블 메인 화면 컨테이너
 * - 친구 관련 UI/모달은 timerFriendModals.jsx 에서 import
 * - 모달(UI) 코드는 timerModals.jsx 로, 친구 공부/요청 상태는 FriendContext 로 분리
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Alert,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createTimerStyles, getNormalize } from '../../styles/timer';
import { colors, fonts } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MessageTabIcon from '../../assets/Group 166.svg';
import ViewShot from 'react-native-view-shot';
import { api } from '../../utils/api';
import {
  getTimerDayKey,
  loadDayFromStorage,
  saveDayToStorage,
  flushPreviousDayAndLoadCurrent,
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
import { useSocket } from '../../context/SocketContext';
import { useFocusEffect } from '@react-navigation/native';
import { useFriendStudyEvents } from '../../hooks/useFriendStudyEvents';

// ── 상수 ────────────────────────────────────────────────
// - SUBJECT/TASK/HOURS 등 화면 전체에서 공유하는 기본 값
// - 더미 과목/할일 대신, 처음에는 비어 있고 사용자가 추가하면 저장된다.
const DEFAULT_SUBJECTS = [];
const DEFAULT_TASKS = [];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIMETABLE_GRAY = '#A6DA95';

// ── 유틸 ─────────────────────────────────────────────────
const getMinutesFromMidnight = (d) => d.getHours() * 60 + d.getMinutes();
const getSecondsFromMidnight = (d) =>
  d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

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

  // ── 친구 상태 ─────────────────────────────────────────
  // - 상단 FriendStoryBar + 친구 모달에서 사용하는 친구 목록/쿡 찌르기 대상
  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pokeTarget, setPokeTarget] = useState(null);
  const [pokeVisible, setPokeVisible] = useState(false);

  const { showToast } = useToast();
  const pushTimerToast = (senderName, body) => {
    const s = String(senderName || '알림').trim();
    const b = String(body || '').trim();
    if (!b) return;
    showToast({
      message: `${s}: ${b}`,
      senderName: s,
      body: b,
      showProgress: true,
    });
  };

  const { studyingFriends, refreshStudyingFriends } = useFriend();
  const { connected, reconnect } = useSocket();

  // ── 실시간 소켓 이벤트 연동 ─────────────────────────────
  const { emitTimerStatus } = useFriendSocketEvents({});

  useFriendStudyEvents({
    onFriendStudyFinished: ({ userId, finishedAt, type }) => {
      console.log('[Timer] onFriendStudyFinished 콜백 실행', {
        userId,
        finishedAt,
        type,
      });
      setFriends((prev) => {
        const friend = prev.find((f) => f.id === userId);
        if (friend) {
          pushTimerToast(friend.name, '공부가 끝났어요');
        } else {
          pushTimerToast('친구', '공부가 끝났어요');
        }
        return prev;
      });
    },
    onPoke: (payload) => {
      pushTimerToast(
        payload?.fromNickname ?? '친구',
        '쿡 찌르기 알림이 왔어요!',
      );
    },
    onMyStudyFinishedSummary: ({ toastText }) => {
      pushTimerToast('타이머', toastText ?? '공부 완료 🎉');
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
      refreshStudyingFriends?.();
      if (!connected) {
        reconnect?.();
      }
    }, [refreshStudyingFriends, connected, reconnect]),
  );

  // 친구 관련 핸들러 (모달 열기까지만 담당, 쿡 찌르기 로직은 FriendPokeController 에서 처리)
  const handleFriendPress = (friend) => {
    const isActive = studyingFriends?.[friend.id] === true;
    setPokeTarget({ ...friend, isActive });
    setPokeVisible(true);
  };

  // ── 타이머/투두 상태 ──────────────────────────────────
  // - 과목/할일/세션/날짜/타이머 실행 여부 등 메인 비즈니스 상태
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [sessions, setSessions] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskSubjectId, setAddTaskSubjectId] = useState(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState({});
  const [timerDayKey, setTimerDayKey] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const saveTimeoutRef = useRef(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [viewState, setViewState] = useState(null);
  const capturePlannerRef = useRef(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const todayKey = getTimerDayKey(new Date());

  // ── 스토리지 로드/저장 ────────────────────────────────
  const loadDayData = async (dayKey) => {
    if (dayKey === todayKey) return loadDayFromStorage(dayKey);
    return dayKey < todayKey
      ? loadDayFromDb(dayKey)
      : loadDayFromStorage(dayKey);
  };

  useEffect(() => {
    let mounted = true;
    const dayKey = getTimerDayKey(new Date());
    flushPreviousDayAndLoadCurrent(dayKey).then((data) => {
      if (!mounted) return;
      setTimerDayKey(dayKey);
      setSelectedDayKey(dayKey);
      if (data != null) {
        const loadedSessions = data.sessions ?? [];
        setSessions(loadedSessions);
        setTotalElapsedMs(data.totalElapsedMs ?? 0);
        setSubjects(data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS);
        setTasks(data.tasks?.length ? data.tasks : DEFAULT_TASKS);

        // 진행 중 세션이 있으면 타이머 상태 복구
        const now = new Date();
        const nowSec = getSecondsFromMidnight(now);
        let openSession = null;
        for (let i = loadedSessions.length - 1; i >= 0; i -= 1) {
          if (loadedSessions[i].endSeconds == null) {
            openSession = loadedSessions[i];
            break;
          }
        }
        if (openSession) {
          const startSec = Number(openSession.startSeconds) || 0;
          const diffMs = Math.max(0, (nowSec - startSec) * 1000);
          setIsRunning(true);
          setActiveSubjectId(
            openSession.subjectId != null ? openSession.subjectId : null,
          );
          const ts = Date.now() - diffMs;
          setStartTimestamp(ts);
          setElapsedMs(diffMs);
        } else {
          setIsRunning(false);
          setStartTimestamp(null);
          setElapsedMs(0);
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
    if (!initialLoadDone || timerDayKey == null || selectedDayKey !== todayKey)
      return;
    const payload = { sessions, totalElapsedMs, subjects, tasks };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDayToStorage(timerDayKey, payload);
      saveTimeoutRef.current = null;
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    initialLoadDone,
    timerDayKey,
    selectedDayKey,
    todayKey,
    sessions,
    totalElapsedMs,
    subjects,
    tasks,
  ]);

  useEffect(() => {
    const checkDayChange = () => {
      const nowKey = getTimerDayKey(new Date());
      if (timerDayKey != null && nowKey !== timerDayKey) {
        const payload = { sessions, totalElapsedMs, subjects, tasks };
        saveDayToStorage(timerDayKey, payload);
        saveDayToDb(timerDayKey, payload).then(() => {
          setTimerDayKey(nowKey);
          loadDayFromStorage(nowKey).then((data) => {
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
            setElapsedMs(0);
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
  }, [timerDayKey, sessions, totalElapsedMs, subjects, tasks]);

  useEffect(() => {
    let t;
    if (isRunning && startTimestamp != null)
      t = setInterval(() => setElapsedMs(Date.now() - startTimestamp), 1000);
    return () => {
      if (t) clearInterval(t);
    };
  }, [isRunning, startTimestamp]);

  // ── 투두/과목 핸들러 ──────────────────────────────────
  const addSubject = (payload) => {
    const id = Math.max(0, ...subjects.map((s) => s.id)) + 1;
    setSubjects((prev) => [
      ...prev,
      { id, name: payload.name, color: payload.color },
    ]);
  };

  const addTask = (payload) => {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [
      ...prev,
      {
        id,
        subjectId: payload.subjectId,
        content: payload.content,
        status: 'pending',
      },
    ]);
  };

  const setTaskStatus = (taskId, status) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );

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
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].subjectId === subjectId && next[i].endSeconds == null) {
          next[i] = {
            ...next[i],
            endSeconds: getSecondsFromMidnight(new Date()),
          };
          break;
        }
      }
      return next;
    });

  const startForSubject = (subjectId) => {
    if (isRunning && activeSubjectId === subjectId) return;
    if (isRunning) {
      endCurrentSession();
      closeOpenSession(activeSubjectId);
    }
    setActiveSubjectId(subjectId);
    setIsRunning(true);
    setElapsedMs(0);
    setStartTimestamp(Date.now());
    setSessions((prev) => [
      ...prev,
      {
        subjectId,
        startSeconds: getSecondsFromMidnight(new Date()),
        endSeconds: null,
      },
    ]);
    const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? null;
    emitTimerStatus('studying', {
      dayKey: timerDayKey ?? getTimerDayKey(new Date()),
      subjectId,
      subjectName,
      startSeconds: getSecondsFromMidnight(new Date()),
    });
  };

  const startTimerTop = () => {
    if (isRunning && activeSubjectId === null) return;
    if (isRunning) {
      endCurrentSession();
      closeOpenSession(activeSubjectId);
    }
    setActiveSubjectId(null);
    setIsRunning(true);
    setElapsedMs(0);
    setStartTimestamp(Date.now());
    setSessions((prev) => [
      ...prev,
      {
        subjectId: null,
        startSeconds: getSecondsFromMidnight(new Date()),
        endSeconds: null,
      },
    ]);
    emitTimerStatus('studying', {
      dayKey: timerDayKey ?? getTimerDayKey(new Date()),
      subjectId: null,
      subjectName: null,
      startSeconds: getSecondsFromMidnight(new Date()),
    });
  };

  const pauseTimer = () => {
    if (!isRunning) return;
    endCurrentSession();
    closeOpenSession(activeSubjectId);
    setIsRunning(false);
    setElapsedMs(0);
    setStartTimestamp(null);
    emitTimerStatus('idle');
  };

  const toggleTimer = () => (isRunning ? pauseTimer() : startTimerTop());

  const getTotalDisplayMs = () => totalElapsedMs + (isRunning ? elapsedMs : 0);

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
        Alert.alert('권한 필요', '사진 저장 권한이 필요합니다.');
        return;
      }
      const uri = await capturePlannerRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '갤러리에 저장되었습니다.');
    } catch (e) {
      Alert.alert('저장 실패', e?.message || '이미지 저장에 실패했습니다.');
    }
  };

  const toggleSubjectCollapsed = (subjectId) =>
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));

  // ── [개발용] 전체 초기화 ──────────────────────────────
  const handleDevReset = () => {
    Alert.alert('개발용 초기화', '모든 타이머 데이터를 초기화할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          setSessions([]);
          setTotalElapsedMs(0);
          setSubjects(DEFAULT_SUBJECTS);
          setTasks(DEFAULT_TASKS);
          setIsRunning(false);
          setElapsedMs(0);
          setStartTimestamp(null);
          setActiveSubjectId(null);
          pushTimerToast('타이머', '데이터가 초기화되었습니다');
        },
      },
    ]);
  };

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
  const displayTotalMs = isViewingToday
    ? getTotalDisplayMs()
    : displayTotalElapsedMs;

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    return displaySessions
      .filter((s) => s.subjectId === subjectId && s.endSeconds != null)
      .reduce((sum, s) => sum + (s.endSeconds - s.startSeconds) * 1000, 0);
  };

  const getSlotSegments = (slotStartSeconds) => {
    const slotEnd = slotStartSeconds + 600;
    const nowSec = getSecondsFromMidnight(new Date());
    const segments = [];
    displaySessions.forEach((s) => {
      const endSec = s.endSeconds != null ? s.endSeconds : nowSec;
      if (endSec <= slotStartSeconds || s.startSeconds >= slotEnd) return;
      const overlapStart = Math.max(s.startSeconds, slotStartSeconds);
      const overlapEnd = Math.min(endSec, slotEnd);
      const startFraction = (overlapStart - slotStartSeconds) / 600;
      const widthFraction = (overlapEnd - overlapStart) / 600;
      if (widthFraction <= 0) return;
      const color =
        s.subjectId == null
          ? TIMETABLE_GRAY
          : displaySubjects.find((x) => x.id === s.subjectId)?.color;
      if (!color) return;
      segments.push({ color, widthFraction, startFraction });
    });
    segments.sort((a, b) => a.startFraction - b.startFraction);
    return segments;
  };

  // ── 타임테이블 렌더 헬퍼 ──────────────────────────────
  const renderTimetable = () =>
    HOURS.map((rowIndex) => {
      const hour = (6 + rowIndex) % 24;
      const slotStartBaseSeconds = hour * 3600;
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

  // ─────────────────────────────────────────────────────
  // 실제 화면 레이아웃:
  // - 헤더/푸터는 Timer 래퍼에서 담당
  // - 여기서는 타이머 본문(친구 바 + 타이머 + 투두 + 타임테이블 + 모달)만 렌더링
  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ① 친구 목록 (분리된 컴포넌트) */}
        <FriendStoryBar
          friends={friends}
          studyingFriends={studyingFriends}
          normalize={normalize}
          styles={styles}
          onFriendPress={handleFriendPress}
          onAddFriendPress={() => setShowAddFriend(true)}
        />

        {/* ② 날짜 바 */}
        <View style={styles.dateBar}>
          <View style={styles.dateBarLeft}>
            <TouchableOpacity
              onPress={goPrevDay}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ padding: 4 }}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              style={{ minWidth: normalize(100) }}
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
              style={{ padding: 4 }}
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

          {/* 개발용 초기화 버튼 - 배포 전 삭제 */}
          <TouchableOpacity
            onPress={handleDevReset}
            style={{
              marginLeft: 8,
              padding: 6,
              backgroundColor: '#FFE0E0',
              borderRadius: 8,
            }}
          >
            <Text
              style={{ fontSize: 11, color: '#CC3333', fontWeight: '700' }}
            >
              DEV초기화
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. 타이머 (누적 시·분·초) */}
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

        <View style={styles.divider} />

        {/* ④ 투두리스트 + 타임테이블 */}
        <View style={styles.todoTimetableRow}>
          {/* 왼쪽: 투두리스트 */}
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
                    color={colors.primary}
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
                  ? formatHMS(totalMs + elapsedMs)
                  : formatHMS(totalMs);
                const isCollapsed = collapsedSubjects[sub.id] === true;
                return (
                  <View key={sub.id} style={styles.subjectBlock}>
                    <View style={styles.subjectRow}>
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
                    </View>
                    {!isCollapsed && (
                      <>
                        {subTasks.map((task) => (
                          <View key={task.id} style={styles.taskRow}>
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
                          </View>
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

          {/* 오른쪽: 타임테이블 */}
          <View style={styles.timetableColumn}>
            <Text style={styles.timetableTitle}>공부 기록</Text>
            <View style={styles.timetableScroll}>{renderTimetable()}</View>
          </View>
        </View>
      </ScrollView>

      {/* 캡처용 오프스크린 플래너 */}
      <View
        style={{ position: 'absolute', left: -width * 2, top: 0, width: width }}
        pointerEvents="none"
      >
        <ViewShot
          ref={capturePlannerRef}
          options={{ format: 'png', quality: 1 }}
          style={{ backgroundColor: colors.background }}
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
                    <View key={sub.id} style={{ marginBottom: normalize(10) }}>
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

          Alert.alert('친구 요청', `@${username} 님에게 친구 요청을 보내시겠어요?`, [
            { text: '취소', style: 'cancel' },
            {
              text: '보내기',
              onPress: async () => {
                console.log('[Timer][FriendRequest] 보내기 버튼 눌림 → API 요청 시작', {
                  username,
                  target: `@${username}`,
                });
                try {
                  const res = await api.post('/api/friends/requests', {
                    username,
                  });
                  const data = res.data?.data || {};
                  const targetName =
                    data.targetName || data.targetUsername || `@${username}`;
                  console.log('[Timer][FriendRequest] API 성공 → 백엔드에서 수신자에게 소켓 알림 전송됨', {
                    requestId: data.requestId,
                    targetUserId: data.targetUserId,
                    targetUsername: data.targetUsername,
                    targetName,
                  });
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
                      '친구 요청 중 오류가 발생했습니다.',
                  );
                }
              },
            },
          ]);
        }}
      />

    </>
  );
};

// ── 화면 래퍼 ────────────────────────────────────────────
// 네비게이션/헤더/푸터를 감싸고 TimerContent 를 끼워 넣는 얇은 컴포넌트
const Timer = ({ navigation }) => (
  <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
    <MainHeader activeTab="timer" navigation={navigation} />
    <TimerContent />
    <MainFooter
      activeTab="timer"
      onTabPress={(tab) => {
        if (tab === 'board') navigation.navigate('Main');
        if (tab === 'message') navigation.navigate('Message');
        if (tab === 'school') navigation.navigate('SchoolBoardAll');
        if (tab === 'mypage') navigation.navigate('MyPage');
      }}
    />
  </SafeAreaView>
);

export default Timer;

// ── 공유 모달 스타일 ─────────────────────────────────────
const modalStyles = {
  wrapper: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.textLight10,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  colorWrap: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.primary },
  randomBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.textLight5,
    borderRadius: 8,
  },
  randomText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 14, color: colors.textSecondary },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textWhite,
  },
  btnDisabled: { opacity: 0.5 },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
};
