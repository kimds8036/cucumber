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
import MessageTabIcon from '../../assets/Group 166.svg';
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
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

const FRIEND_ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue];
const getFriendIconColorByIndex = (i) => FRIEND_ICON_COLORS[i % FRIEND_ICON_COLORS.length];

const INITIAL_FRIENDS = [
  { id: 1, name: '친구1', colorIndex: 0, isActive: true },
  { id: 2, name: '친구2', colorIndex: 1, isActive: false },
  { id: 3, name: '친구3', colorIndex: 2, isActive: false },
];

// 과목용 색상 팔레트 (스터디 플래너 스타일)
const SUBJECT_COLORS = [
  '#FFB5C2', '#C4A77D', '#7FCDCD', '#87CEEB', '#98D8A6', '#B19CD9', '#FFB366', '#9FB5C7',
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

const getMinutesFromMidnight = (d) => d.getHours() * 60 + d.getMinutes();
const getSecondsFromMidnight = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

/** dayKey "YYYY-MM-DD" → Date 6시 기준 */
function dateFromDayKey(dayKey) {
  return new Date(dayKey + 'T06:00:00');
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHMS(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ── 과목 추가 모달 ─────────────────────────────────────
const AddSubjectModal = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const pickRandom = () => setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);

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
      <TouchableOpacity style={modalStyles.overlay} onPress={onClose} activeOpacity={1} />
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
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
            <TouchableOpacity onPress={pickRandom} style={modalStyles.randomBtn}>
              <Text style={modalStyles.randomText}>랜덤</Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.row}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.primaryBtn, !name.trim() && modalStyles.btnDisabled]}
              onPress={handleAdd}
              disabled={!name.trim()}
            >
              <Text style={modalStyles.primaryText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── 할일 추가 모달 ─────────────────────────────────────
const AddTaskModal = ({ visible, onClose, onAdd, subjects, initialSubjectId }) => {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (visible && subjects.length > 0) {
      setSubjectId(initialSubjectId ?? subjects[0].id);
    }
  }, [visible, subjects, initialSubjectId]);

  const handleClose = () => {
    setContent('');
    onClose();
  };

  const handleAdd = () => {
    if (!content.trim() || !subjectId) return;
    onAdd({ subjectId, content: content.trim() });
    setContent('');
    onClose();
  };

  if (!visible) return null;
  if (subjects.length === 0) {
    return (
      <Modal transparent animationType="fade" onRequestClose={handleClose}>
        <TouchableOpacity style={modalStyles.overlay} onPress={handleClose} activeOpacity={1} />
        <View style={modalStyles.centered}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>할일 추가</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>과목을 먼저 추가해주세요.</Text>
            <TouchableOpacity style={modalStyles.primaryBtn} onPress={handleClose}>
              <Text style={modalStyles.primaryText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={modalStyles.overlay} onPress={handleClose} activeOpacity={1} />
      <View style={modalStyles.centered}>
        <View style={modalStyles.card}>
          <Text style={modalStyles.title}>할일 추가</Text>
          <Text style={modalStyles.label}>과목</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={[
                    modalStyles.subjectChip,
                    { borderColor: s.color },
                    subjectId === s.id && { backgroundColor: s.color + '30' },
                  ]}
                >
                  <View style={[modalStyles.chipDot, { backgroundColor: s.color }]} />
                  <Text style={modalStyles.chipText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={modalStyles.label}>내용</Text>
          <TextInput
            style={[modalStyles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="할 일 내용"
            placeholderTextColor={colors.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
          />
          <View style={modalStyles.row}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={handleClose}>
              <Text style={modalStyles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.primaryBtn, (!content.trim() || !subjectId) && modalStyles.btnDisabled]}
              onPress={handleAdd}
              disabled={!content.trim() || !subjectId}
            >
              <Text style={modalStyles.primaryText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── 달력 모달 (날짜 선택) ─────────────────────────────────
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
  const days = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const goPrevMonth = () => {
    if (yearMonth.month === 0) setYearMonth({ year: yearMonth.year - 1, month: 11 });
    else setYearMonth({ year: yearMonth.year, month: yearMonth.month - 1 });
  };
  const goNextMonth = () => {
    if (yearMonth.month === 11) setYearMonth({ year: yearMonth.year + 1, month: 0 });
    else setYearMonth({ year: yearMonth.year, month: yearMonth.month + 1 });
  };

  const getDayKey = (day) => {
    if (!day) return null;
    const d = new Date(yearMonth.year, yearMonth.month, day, 6, 0, 0);
    return getTimerDayKey(d);
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={[modalStyles.centered, { justifyContent: 'center' }]}>
        <View style={[modalStyles.card, { maxWidth: 360 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.textPrimary }}>
              {yearMonth.year}년 {yearMonth.month + 1}월
            </Text>
            <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['일','월','화','수','목','금','토'].map((w, i) => (
              <View key={w} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary }}>{w}</Text>
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
                    backgroundColor: isCurrent ? colors.primary : 'transparent',
                    borderRadius: 20,
                  }}
                  onPress={() => { if (key) { onSelectDay(key); onClose(); } }}
                  disabled={!day}
                >
                  <Text style={{
                    fontSize: 14,
                    fontFamily: fonts.regular,
                    color: !day ? 'transparent' : isCurrent ? colors.textWhite : colors.textPrimary,
                  }}>
                    {day || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = {
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: colors.background, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 },
  title: { fontSize: 17, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 16 },
  label: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.textLight10, borderRadius: 12, padding: 12, fontSize: 14, color: colors.textPrimary, marginBottom: 12 },
  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  colorWrap: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.primary },
  randomBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.textLight5, borderRadius: 8 },
  randomText: { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 14, color: colors.textSecondary },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  primaryText: { fontSize: 14, fontFamily: fonts.bold, color: colors.textWhite },
  btnDisabled: { opacity: 0.5 },
  subjectChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 2, gap: 6 },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: 13, fontFamily: fonts.regular, color: colors.textPrimary },
};

// ── 메인 콘텐츠 ────────────────────────────────────────
export const TimerContent = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createTimerStyles(width, normalize), [width, normalize]);

  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [showAddFriend, setShowAddFriend] = useState(false);

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

  const loadDayData = async (dayKey) => {
    if (dayKey === todayKey) {
      const data = await loadDayFromStorage(dayKey);
      return data;
    }
    const isPast = dayKey < todayKey;
    if (isPast) return loadDayFromDb(dayKey);
    return loadDayFromStorage(dayKey);
  };

  const applyDayData = (data) => {
    if (!data) {
      setSessions([]);
      setTotalElapsedMs(0);
      setSubjects(DEFAULT_SUBJECTS);
      setTasks(DEFAULT_TASKS);
      return;
    }
    setSessions(data.sessions ?? []);
    setTotalElapsedMs(data.totalElapsedMs ?? 0);
    setSubjects(data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS);
    setTasks(data.tasks?.length ? data.tasks : DEFAULT_TASKS);
  };

  // 마운트 시: 전날 미동기화면 DB 저장 후, 당일 로컬 데이터 로드 → 과목별 시간(sessions) 포함 항상 복원
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
    return () => { mounted = false; };
  }, []);

  // 선택한 날짜 변경 시: 오늘은 로컬, 전날 이전은 DB에서 로드
  useEffect(() => {
    if (!initialLoadDone || selectedDayKey == null) return;
    if (selectedDayKey === todayKey) {
      setViewState(null);
      return;
    }
    loadDayData(selectedDayKey).then((data) => {
      setViewState(data ? {
        sessions: data.sessions ?? [],
        totalElapsedMs: data.totalElapsedMs ?? 0,
        subjects: data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS,
        tasks: data.tasks?.length ? data.tasks : DEFAULT_TASKS,
      } : { sessions: [], totalElapsedMs: 0, subjects: DEFAULT_SUBJECTS, tasks: DEFAULT_TASKS });
    });
  }, [selectedDayKey, todayKey, initialLoadDone]);

  // 오늘만 로컬 캐시에 저장 (전날 이전은 DB에서 불러오므로 저장 불필요)
  useEffect(() => {
    if (!initialLoadDone || timerDayKey == null || selectedDayKey !== todayKey) return;
    const payload = {
      sessions,
      totalElapsedMs,
      subjects,
      tasks,
    };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDayToStorage(timerDayKey, payload);
      saveTimeoutRef.current = null;
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [initialLoadDone, timerDayKey, selectedDayKey, todayKey, sessions, totalElapsedMs, subjects, tasks]);

  // 날짜가 바뀌었는지 주기적 확인 (6시~익일 5시59분 기준). 바뀌면 전날 로컬→DB 저장 후 당일 로드
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
              setSubjects(data.subjects?.length ? data.subjects : DEFAULT_SUBJECTS);
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
    if (isRunning && startTimestamp != null) {
      t = setInterval(() => setElapsedMs(Date.now() - startTimestamp), 1000);
    }
    return () => { if (t) clearInterval(t); };
  }, [isRunning, startTimestamp]);

  const addSubject = (payload) => {
    const id = Math.max(0, ...subjects.map((s) => s.id)) + 1;
    setSubjects((prev) => [...prev, { id, name: payload.name, color: payload.color }]);
  };

  const addTask = (payload) => {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks((prev) => [...prev, { id, subjectId: payload.subjectId, content: payload.content, status: 'pending' }]);
  };

  const setTaskStatus = (taskId, status) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const endCurrentSession = () => {
    if (startTimestamp == null) return 0;
    const duration = Date.now() - startTimestamp;
    setTotalElapsedMs((prev) => prev + duration);
    return duration;
  };

  const startForSubject = (subjectId) => {
    if (isRunning && activeSubjectId === subjectId) return;
    if (isRunning) {
      const now = new Date();
      const endSeconds = getSecondsFromMidnight(now);
      endCurrentSession();
      setSessions((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].subjectId === activeSubjectId && next[i].endSeconds == null) {
            next[i] = { ...next[i], endSeconds };
            break;
          }
        }
        return next;
      });
    }
    setActiveSubjectId(subjectId);
    setIsRunning(true);
    setElapsedMs(0);
    setStartTimestamp(Date.now());
    const now = new Date();
    const startSeconds = getSecondsFromMidnight(now);
    setSessions((prev) => [...prev, { subjectId, startSeconds, endSeconds: null }]);
  };

  const startTimerTop = () => {
    if (isRunning && activeSubjectId === null) return;
    if (isRunning) {
      const now = new Date();
      const endSeconds = getSecondsFromMidnight(now);
      endCurrentSession();
      setSessions((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].subjectId === activeSubjectId && next[i].endSeconds == null) {
            next[i] = { ...next[i], endSeconds };
            break;
          }
        }
        return next;
      });
    }
    setActiveSubjectId(null);
    setIsRunning(true);
    setElapsedMs(0);
    setStartTimestamp(Date.now());
    const now = new Date();
    const startSeconds = getSecondsFromMidnight(now);
    setSessions((prev) => [...prev, { subjectId: null, startSeconds, endSeconds: null }]);
  };

  const pauseTimer = () => {
    if (!isRunning) return;
    const now = new Date();
    const endSeconds = getSecondsFromMidnight(now);
    endCurrentSession();
    setSessions((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].subjectId === activeSubjectId && next[i].endSeconds == null) {
          next[i] = { ...next[i], endSeconds };
          break;
        }
      }
      return next;
    });
    setIsRunning(false);
    setElapsedMs(0);
    setStartTimestamp(null);
  };

  const toggleTimer = () => {
    if (isRunning) pauseTimer();
    else startTimerTop();
  };

  const getTotalDisplayMs = () => totalElapsedMs + (isRunning ? elapsedMs : 0);

  const isViewingToday = selectedDayKey === todayKey;
  const displaySessions = isViewingToday ? sessions : (viewState?.sessions ?? []);
  const displayTotalElapsedMs = isViewingToday ? totalElapsedMs : (viewState?.totalElapsedMs ?? 0);
  const displaySubjects = isViewingToday ? subjects : (viewState?.subjects ?? DEFAULT_SUBJECTS);
  const displayTasks = isViewingToday ? tasks : (viewState?.tasks ?? DEFAULT_TASKS);
  const displayTotalMs = isViewingToday ? getTotalDisplayMs() : displayTotalElapsedMs;

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    return displaySessions
      .filter((s) => s.subjectId === subjectId && s.endSeconds != null)
      .reduce((sum, s) => sum + (s.endSeconds - s.startSeconds) * 1000, 0);
  };

  const currentSecondsFromMidnight = () => getSecondsFromMidnight(new Date());

  /** 한 슬롯(600초) 안에서 초 단위 세그먼트. startFraction = 슬롯 내 시작 위치(0~1), widthFraction = 길이 (예: 3시 35분 30초 시작이면 한 칸에서 중간부터) */
  const getSlotSegments = (slotStartSeconds) => {
    const slotEnd = slotStartSeconds + 600;
    const nowSec = currentSecondsFromMidnight();
    const segments = [];
    displaySessions.forEach((s) => {
      const endSec = s.endSeconds != null ? s.endSeconds : nowSec;
      if (endSec <= slotStartSeconds || s.startSeconds >= slotEnd) return;
      const overlapStart = Math.max(s.startSeconds, slotStartSeconds);
      const overlapEnd = Math.min(endSec, slotEnd);
      const startFraction = (overlapStart - slotStartSeconds) / 600;
      const widthFraction = (overlapEnd - overlapStart) / 600;
      if (widthFraction <= 0) return;
      const color = s.subjectId == null ? TIMETABLE_GRAY : (displaySubjects.find((x) => x.id === s.subjectId)?.color);
      if (!color) return;
      segments.push({ color, widthFraction, startFraction });
    });
    segments.sort((a, b) => a.startFraction - b.startFraction);
    return segments;
  };

  const goPrevDay = () => {
    if (!selectedDayKey) return;
    const d = dateFromDayKey(selectedDayKey);
    setSelectedDayKey(getPreviousDayKey(d));
  };
  const goNextDay = () => {
    if (!selectedDayKey) return;
    const d = dateFromDayKey(selectedDayKey);
    setSelectedDayKey(getNextDayKey(d));
  };

  const handleSaveAsImage = async () => {
    if (!capturePlannerRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리에 저장하려면 사진 저장 권한이 필요합니다.');
        return;
      }
      const uri = await capturePlannerRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '갤러리에 저장되었습니다.');
    } catch (e) {
      Alert.alert('저장 실패', e?.message || '이미지 저장에 실패했습니다.');
    }
  };

  const toggleSubjectCollapsed = (subjectId) => {
    setCollapsedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const openAddTaskForSubject = (subjectId) => {
    setAddTaskSubjectId(subjectId);
    setShowAddTask(true);
  };

  const TIMETABLE_GRAY = '#A6DA95';

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 친구 목록 (일렬 배치, 추가 버튼에 "친구 추가" 라벨, 상태점 원에 걸침) */}
        <View style={styles.friendStoryRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendStoryScroll}
          >
            <TouchableOpacity
              style={styles.friendStoryAddCircleWrap}
              onPress={() => setShowAddFriend(true)}
              activeOpacity={0.8}
            >
              <View style={styles.friendStoryAddCircle}>
                <Ionicons name="add" size={normalize(28)} color={colors.primary} />
              </View>
              <Text style={styles.friendStoryAddLabel}>친구 추가</Text>
            </TouchableOpacity>
            {friends.map((friend) => {
              const iconColor = getFriendIconColorByIndex(friend.colorIndex);
              return (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendStoryCircleWrap}
                  onPress={() => Alert.alert(friend.name, '친구 프로필')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.friendStoryCircle, { backgroundColor: colors.primaryLight30, borderColor: colors.primary }]}>
                    <MessageTabIcon width={normalize(22)} height={normalize(22)} color={iconColor} />
                    <View style={[styles.friendStatusDotOnCircle, friend.isActive ? styles.friendStatusDotActive : styles.friendStatusDotInactive]} />
                  </View>
                  <Text style={styles.friendStoryName} numberOfLines={1}>{friend.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.dateBar}>
          <View style={styles.dateBarLeft}>
            <TouchableOpacity onPress={goPrevDay} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(true)} style={{ minWidth: normalize(100) }}>
              <Text style={styles.dateBarText}>
                {selectedDayKey ? selectedDayKey.replace(/-/g, '.') : '--.--.--'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNextDay} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAsImage}>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text style={styles.saveBtnText}>저장하기</Text>
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
            <Text style={[styles.timerBtnText, isRunning && styles.timerBtnTextPause]}>
              {isRunning ? '일시정지' : '시작'}
            </Text>
          </TouchableOpacity>
          )}
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 3. 투두리스트 | 타임테이블 수평 배치 */}
        <View style={styles.todoTimetableRow}>
          {/* 왼쪽: 투두리스트 */}
          <View style={styles.todoColumn}>
            <View style={styles.todoHeader}>
              <Text style={styles.todoTitle}>투두리스트</Text>
              {isViewingToday && (
              <TouchableOpacity style={styles.todoAddBtn} onPress={() => setShowAddSubject(true)}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.todoAddBtnText}>과목 추가</Text>
              </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.todoList} showsVerticalScrollIndicator={false}>
              {displaySubjects.map((sub) => {
                const subTasks = displayTasks.filter((t) => t.subjectId === sub.id);
                const totalMs = getSubjectTotalMs(sub.id);
                const isThisSubjectRunning = isRunning && activeSubjectId === sub.id;
                const totalStr = isThisSubjectRunning ? formatHMS(totalMs + elapsedMs) : formatHMS(totalMs);
                const isCollapsed = collapsedSubjects[sub.id] === true;
                return (
                  <View key={sub.id} style={styles.subjectBlock}>
                    <View style={styles.subjectRow}>
                      <View style={[styles.subjectColorBar, { backgroundColor: sub.color }]} />
                      <View style={styles.subjectBody}>
                        <Text style={styles.subjectName}>{sub.name}</Text>
                        <Text style={styles.subjectTime}>{totalStr}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.subjectPlayBtn, { backgroundColor: sub.color }, activeSubjectId === sub.id && isRunning && styles.subjectPlayBtnActive]}
                        onPress={() => (isRunning && activeSubjectId === sub.id ? pauseTimer() : startForSubject(sub.id))}
                        disabled={!isViewingToday}
                      >
                        <Ionicons
                          name={isRunning && activeSubjectId === sub.id ? 'pause' : 'play'}
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
                              style={[styles.taskCheckbox, task.status === 'done' && styles.taskCheckboxChecked]}
                              onPress={() => isViewingToday && setTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                              disabled={!isViewingToday}
                            >
                              {task.status === 'done' && <Ionicons name="checkmark" size={normalize(14)} color={colors.textWhite} />}
                            </TouchableOpacity>
                            <Text style={[styles.taskContent, task.status === 'done' && styles.taskContentDone]} numberOfLines={1}>{task.content}</Text>
                          </View>
                        ))}
                        <TouchableOpacity style={styles.todoAddUnderSubject} onPress={() => openAddTaskForSubject(sub.id)} disabled={!isViewingToday}>
                          <Text style={styles.todoAddUnderSubjectText}>+ 추가</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* 오른쪽: 타임테이블 (초 단위 세그먼트) */}
          <View style={styles.timetableColumn}>
            <Text style={styles.timetableTitle}>공부 기록</Text>
            <View style={styles.timetableScroll}>
              {HOURS.map((rowIndex) => {
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
                                    <View style={[styles.timetableSlotSegment, { flex: spacerFlex, backgroundColor: colors.background }]} />
                                  )}
                                  <View
                                    style={[
                                      styles.timetableSlotSegment,
                                      { backgroundColor: seg.color, flex: seg.widthFraction },
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
          </View>
        </View>
      </ScrollView>

      {/* 저장 시 캡처용 플래너 (오프스크린): 좌 날짜/시간/투두, 우 타임테이블, 버튼 없음 */}
      <View style={{ position: 'absolute', left: -width * 2, top: 0, width: width }} pointerEvents="none">
        <ViewShot ref={capturePlannerRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: '#fff' }}>
          <View style={styles.plannerCaptureWrap}>
            <View style={styles.plannerCaptureRow}>
              <View style={styles.plannerLeftColumn}>
                <Text style={styles.plannerLabel}>Date</Text>
                <Text style={styles.plannerValue}>{selectedDayKey ? selectedDayKey.replace(/-/g, '.') : '--.--.--'}</Text>
                <Text style={styles.plannerLabel}>Time</Text>
                <Text style={styles.plannerValue}>{formatHMS(displayTotalMs)}</Text>
                <Text style={styles.plannerLabel}>To-do List</Text>
                <View style={styles.plannerMemoLine} />
                {displaySubjects.map((sub) => {
                  const subTasks = displayTasks.filter((t) => t.subjectId === sub.id);
                  const totalMs = getSubjectTotalMs(sub.id);
                  const totalStr = formatHMS(totalMs);
                  return (
                    <View key={sub.id} style={{ marginBottom: normalize(10) }}>
                      <View style={styles.plannerSubjectRow}>
                        <View style={[styles.plannerSubjectColorBar, { backgroundColor: sub.color }]} />
                        <View style={styles.plannerSubjectBody}>
                          <Text style={styles.plannerSubjectName}>{sub.name}</Text>
                          <Text style={styles.plannerSubjectTime}>{totalStr}</Text>
                        </View>
                      </View>
                      {subTasks.map((task) => (
                        <View key={task.id} style={styles.plannerTaskRow}>
                          <View style={[styles.plannerTaskCheckbox, task.status === 'done' && styles.plannerTaskCheckboxChecked]}>
                            {task.status === 'done' && <Ionicons name="checkmark" size={normalize(12)} color={colors.textWhite} />}
                          </View>
                          <Text style={[styles.plannerTaskContent, task.status === 'done' && styles.plannerTaskContentDone]} numberOfLines={1}>{task.content}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
              <View style={styles.plannerRightColumn}>
                <Text style={styles.timetableTitle}>공부 기록</Text>
                <View style={styles.timetableScroll}>
                  {HOURS.map((rowIndex) => {
                    const hour = (6 + rowIndex) % 24;
                    const slotStartBaseSeconds = hour * 3600;
                    return (
                      <View key={rowIndex} style={styles.timetableRow}>
                        <View style={styles.timetableHourCell}>
                          <Text style={styles.timetableHourText}>{hour.toString().padStart(2, '0')}</Text>
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
                                        <View style={[styles.timetableSlotSegment, { flex: spacerFlex, backgroundColor: colors.background }]} />
                                      )}
                                      <View
                                        style={[
                                          styles.timetableSlotSegment,
                                          { backgroundColor: seg.color, flex: seg.widthFraction },
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
              </View>
            </View>
          </View>
        </ViewShot>
      </View>

      <AddSubjectModal visible={showAddSubject} onClose={() => setShowAddSubject(false)} onAdd={addSubject} />
      <AddTaskModal
        visible={showAddTask}
        onClose={() => { setShowAddTask(false); setAddTaskSubjectId(null); }}
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

      {showAddFriend && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowAddFriend(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowAddFriend(false)} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 17, fontFamily: fonts.bold, marginBottom: 12 }}>친구 추가</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.textLight10, borderRadius: 12, padding: 12, marginBottom: 12 }}
              placeholder="아이디 검색"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                setFriends((prev) => [...prev, { id: prev.length + 1, name: '새친구', colorIndex: prev.length, isActive: false }]);
                setShowAddFriend(false);
              }}
            >
              <Text style={{ color: colors.textWhite, fontFamily: fonts.bold }}>추가</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
};

const Timer = ({ navigation }) => {
  return (
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
};

export default Timer;
