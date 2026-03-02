/**
 * timer.jsx
 * 타이머 + 투두리스트 + 타임테이블 메인 화면
 * 친구 관련 UI/모달은 timerFriendModals.jsx 에서 import
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Modal,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createTimerStyles, getNormalize } from '../../styles/timer';
import { colors, fonts } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MessageTabIcon from '../../assets/Group 166.svg';
import ViewShot from 'react-native-view-shot';
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

// ── 친구 관련 (분리된 파일) ─────────────────────────────
import {
  INITIAL_FRIENDS,
  FRIEND_ICON_COLORS,
  FriendStoryBar,
  PokeModal,
  AddFriendModal,
  Toast,
} from '../../components/timerFriendModals';

// ── 상수 ────────────────────────────────────────────────
const SUBJECT_COLORS = [
  '#FFB5C2',
  '#C4A77D',
  '#7FCDCD',
  '#87CEEB',
  '#98D8A6',
  '#B19CD9',
  '#FFB366',
  '#9FB5C7',
];
const DEFAULT_SUBJECTS = [
  { id: 1, name: '영어', color: '#FFB5C2' },
  { id: 2, name: '수학', color: '#87CEEB' },
];
const DEFAULT_TASKS = [
  { id: 1, subjectId: 1, content: '모의고사 1', status: 'pending' },
  { id: 2, subjectId: 1, content: '듣기 30문제', status: 'pending' },
  { id: 3, subjectId: 2, content: '수1 문제집 30문제', status: 'pending' },
];
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

// ── 과목 추가 모달 ────────────────────────────────────────
const AddSubjectModal = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const pickRandom = () =>
    setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), color });
    setName('');
    setColor(SUBJECT_COLORS[0]);
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.wrapper}>
        <TouchableOpacity
          style={modalStyles.overlay}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={modalStyles.centered}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>과목 추가</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="과목명"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <View style={modalStyles.colorRow}>
              <Text style={modalStyles.label}>색상</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
              >
                <View style={modalStyles.colorWrap}>
                  {SUBJECT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setColor(c)}
                      style={[
                        modalStyles.colorDot,
                        { backgroundColor: c },
                        color === c && modalStyles.colorDotSelected,
                      ]}
                    />
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity
                onPress={pickRandom}
                style={modalStyles.randomBtn}
              >
                <Text style={modalStyles.randomText}>랜덤</Text>
              </TouchableOpacity>
            </View>
            <View style={modalStyles.row}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
                <Text style={modalStyles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.primaryBtn,
                  !name.trim() && modalStyles.btnDisabled,
                ]}
                onPress={handleAdd}
                disabled={!name.trim()}
              >
                <Text style={modalStyles.primaryText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── 할일 추가 모달 ────────────────────────────────────────
const AddTaskModal = ({
  visible,
  onClose,
  onAdd,
  subjects,
  initialSubjectId,
}) => {
  const [content, setContent] = useState('');
  const effectiveSubjectId = initialSubjectId ?? subjects[0]?.id ?? null;

  useEffect(() => {
    if (!visible) setContent('');
  }, [visible]);

  const handleClose = () => {
    setContent('');
    onClose();
  };
  const handleAdd = () => {
    if (!content.trim() || !effectiveSubjectId) return;
    onAdd({ subjectId: effectiveSubjectId, content: content.trim() });
    setContent('');
    onClose();
  };

  if (!visible) return null;
  if (subjects.length === 0) {
    return (
      <Modal transparent animationType="fade" onRequestClose={handleClose}>
        <View style={modalStyles.wrapper}>
          <TouchableOpacity
            style={modalStyles.overlay}
            onPress={handleClose}
            activeOpacity={1}
          />
          <View style={modalStyles.centered}>
            <View style={modalStyles.card}>
              <Text style={modalStyles.title}>할일 추가</Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 16,
                }}
              >
                과목을 먼저 추가해주세요.
              </Text>
              <TouchableOpacity
                style={modalStyles.primaryBtn}
                onPress={handleClose}
              >
                <Text style={modalStyles.primaryText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose}>
      <View style={modalStyles.wrapper}>
        <TouchableOpacity
          style={modalStyles.overlay}
          onPress={handleClose}
          activeOpacity={1}
        />
        <View style={modalStyles.centered}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>할일 추가</Text>
            <Text style={modalStyles.label}>내용</Text>
            <TextInput
              style={[
                modalStyles.input,
                { minHeight: 60, textAlignVertical: 'top' },
              ]}
              placeholder="할 일 내용"
              placeholderTextColor={colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
            />
            <View style={modalStyles.row}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={handleClose}
              >
                <Text style={modalStyles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.primaryBtn,
                  !content.trim() && modalStyles.btnDisabled,
                ]}
                onPress={handleAdd}
                disabled={!content.trim()}
              >
                <Text style={modalStyles.primaryText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── 달력 모달 ─────────────────────────────────────────────
const CalendarModal = ({ visible, onClose, currentDayKey, onSelectDay }) => {
  const [yearMonth, setYearMonth] = useState(() => {
    const d = dateFromDayKey(currentDayKey || getTimerDayKey(new Date()));
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (visible && currentDayKey) {
      const d = dateFromDayKey(currentDayKey);
      setYearMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [visible, currentDayKey]);

  const firstDay = new Date(yearMonth.year, yearMonth.month, 1);
  const lastDay = new Date(yearMonth.year, yearMonth.month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const days = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goPrevMonth = () =>
    yearMonth.month === 0
      ? setYearMonth({ year: yearMonth.year - 1, month: 11 })
      : setYearMonth({ year: yearMonth.year, month: yearMonth.month - 1 });

  const goNextMonth = () =>
    yearMonth.month === 11
      ? setYearMonth({ year: yearMonth.year + 1, month: 0 })
      : setYearMonth({ year: yearMonth.year, month: yearMonth.month + 1 });

  const getDayKey = (day) => {
    if (!day) return null;
    const d = new Date(yearMonth.year, yearMonth.month, day, 6, 0, 0);
    return getTimerDayKey(d);
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.wrapper}>
        <TouchableOpacity
          style={modalStyles.overlay}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[modalStyles.centered, { justifyContent: 'center' }]}>
          <View style={[modalStyles.card, { maxWidth: 360 }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }}>
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: fonts.bold,
                  color: colors.textPrimary,
                }}
              >
                {yearMonth.year}년 {yearMonth.month + 1}월
              </Text>
              <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }}>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <View
                  key={w}
                  style={{
                    width: '14.28%',
                    alignItems: 'center',
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: fonts.regular,
                      color: colors.textSecondary,
                    }}
                  >
                    {w}
                  </Text>
                </View>
              ))}
              {days.map((day, idx) => {
                const key = getDayKey(day);
                const isCurrent = key === currentDayKey;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      width: '14.28%',
                      alignItems: 'center',
                      paddingVertical: 8,
                      backgroundColor: isCurrent
                        ? colors.primary
                        : 'transparent',
                      borderRadius: 20,
                    }}
                    onPress={() => {
                      if (key) {
                        onSelectDay(key);
                        onClose();
                      }
                    }}
                    disabled={!day}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: fonts.regular,
                        color: !day
                          ? 'transparent'
                          : isCurrent
                            ? colors.textWhite
                            : colors.textPrimary,
                      }}
                    >
                      {day || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── 메인 콘텐츠 ──────────────────────────────────────────
export const TimerContent = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize],
  );

  // ── 친구 상태 ─────────────────────────────────────────
  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pokeTarget, setPokeTarget] = useState(null);
  const [pokeVisible, setPokeVisible] = useState(false);

  // ── 토스트 상태 ───────────────────────────────────────
  const [toastMsg, setToastMsg] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastKey((k) => k + 1);
    setToastVisible(true);
  };

  // 친구 관련 핸들러
  const handleFriendPress = (friend) => {
    setPokeTarget(friend);
    setPokeVisible(true);
  };
  const handlePoke = () => {
    if (pokeTarget)
      showToast(`👉 ${pokeTarget.name}님에게 공부하자! 알림을 보냈어요`);
    setPokeVisible(false);
    setPokeTarget(null);
  };
  const handleNotifyLater = () => {
    if (pokeTarget)
      showToast(`🔔 ${pokeTarget.name}님 공부 완료 시 알림을 예약했어요`);
    setPokeVisible(false);
    setPokeTarget(null);
  };

  // ── 타이머/투두 상태 ──────────────────────────────────
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
        setSessions(data.sessions ?? []);
        setTotalElapsedMs(data.totalElapsedMs ?? 0);
        setSubjects(data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS);
        setTasks(data.tasks?.length ? data.tasks : DEFAULT_TASKS);
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
  };

  const pauseTimer = () => {
    if (!isRunning) return;
    endCurrentSession();
    closeOpenSession(activeSubjectId);
    setIsRunning(false);
    setElapsedMs(0);
    setStartTimestamp(null);
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
          style={{ backgroundColor: '#fff' }}
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

      {/* 친구 모달 (분리된 컴포넌트) */}
      <PokeModal
        visible={pokeVisible}
        friend={pokeTarget}
        onClose={() => {
          setPokeVisible(false);
          setPokeTarget(null);
        }}
        onPoke={handlePoke}
        onNotifyLater={handleNotifyLater}
      />
      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onAdd={(name) => {
          Alert.alert('친구 요청', '친구요청을 보내시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
              text: '보내기',
              onPress: () => {
                setFriends((prev) => [
                  ...prev,
                  {
                    id: prev.length + 1,
                    name,
                    colorIndex: prev.length % FRIEND_ICON_COLORS.length,
                    isActive: false,
                  },
                ]);
                setShowAddFriend(false);
                showToast(`✅ ${name}님에게 친구 요청을 보냈어요`);
              },
            },
          ]);
        }}
      />

      <Toast
        key={toastKey}
        message={toastMsg}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
};

// ── 화면 래퍼 ────────────────────────────────────────────
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
