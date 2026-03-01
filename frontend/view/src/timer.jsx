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
} from '../../utils/timerStorage';

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

const getMinutesFromMidnight = (d) => d.getHours() * 60 + d.getMinutes();

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

  const [subjects, setSubjects] = useState([
    { id: 1, name: '영어', color: '#FFB5C2' },
    { id: 2, name: '수학', color: '#87CEEB' },
  ]);
  const [tasks, setTasks] = useState([
    { id: 1, subjectId: 1, content: '모의고사 1', status: 'pending' },
    { id: 2, subjectId: 1, content: '듣기 30문제', status: 'pending' },
    { id: 3, subjectId: 2, content: '수1 문제집 30문제', status: 'pending' },
  ]);
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
  const saveTimeoutRef = useRef(null);

  // 마운트 시: 전날 미동기화면 DB 저장 후, 당일 로컬 데이터 로드
  useEffect(() => {
    let mounted = true;
    const dayKey = getTimerDayKey(new Date());
    flushPreviousDayAndLoadCurrent(dayKey).then((data) => {
      if (!mounted) return;
      setTimerDayKey(dayKey);
      if (data?.sessions?.length) setSessions(data.sessions);
      if (typeof data?.totalElapsedMs === 'number') setTotalElapsedMs(data.totalElapsedMs);
      if (data?.subjects?.length) setSubjects(data.subjects);
      if (data?.tasks?.length) setTasks(data.tasks);
    });
    return () => { mounted = false; };
  }, []);

  // 세션/누적/과목/할일 변경 시 로컬에 디바운스 저장 (재생 중이어도 저장)
  useEffect(() => {
    if (timerDayKey == null) return;
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
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [timerDayKey, sessions, totalElapsedMs, subjects, tasks]);

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
            if (data?.sessions?.length) setSessions(data.sessions);
            else setSessions([]);
            if (typeof data?.totalElapsedMs === 'number') setTotalElapsedMs(data.totalElapsedMs);
            else setTotalElapsedMs(0);
            if (data?.subjects?.length) setSubjects(data.subjects);
            if (data?.tasks?.length) setTasks(data.tasks);
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
      const endMinutes = getMinutesFromMidnight(now);
      endCurrentSession();
      setSessions((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].subjectId === activeSubjectId && next[i].endMinutes == null) {
            next[i] = { ...next[i], endMinutes };
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
    const startMinutes = getMinutesFromMidnight(now);
    setSessions((prev) => [...prev, { subjectId, startMinutes, endMinutes: null }]);
  };

  const startTimerTop = () => {
    if (isRunning && activeSubjectId === null) return;
    if (isRunning) {
      const now = new Date();
      const endMinutes = getMinutesFromMidnight(now);
      endCurrentSession();
      setSessions((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].subjectId === activeSubjectId && next[i].endMinutes == null) {
            next[i] = { ...next[i], endMinutes };
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
    const startMinutes = getMinutesFromMidnight(now);
    setSessions((prev) => [...prev, { subjectId: null, startMinutes, endMinutes: null }]);
  };

  const pauseTimer = () => {
    if (!isRunning) return;
    const now = new Date();
    const endMinutes = getMinutesFromMidnight(now);
    endCurrentSession();
    setSessions((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].subjectId === activeSubjectId && next[i].endMinutes == null) {
          next[i] = { ...next[i], endMinutes };
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
    else if (activeSubjectId != null) startForSubject(activeSubjectId);
    else startTimerTop();
  };

  const getSubjectTotalMs = (subjectId) => {
    if (subjectId == null) return 0;
    return sessions
      .filter((s) => s.subjectId === subjectId && s.endMinutes != null)
      .reduce((sum, s) => sum + (s.endMinutes - s.startMinutes) * 60 * 1000, 0);
  };

  const getTotalDisplayMs = () => totalElapsedMs + (isRunning ? elapsedMs : 0);

  const toggleSubjectCollapsed = (subjectId) => {
    setCollapsedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const openAddTaskForSubject = (subjectId) => {
    setAddTaskSubjectId(subjectId);
    setShowAddTask(true);
  };

  const isSlotForSubject = (subjectId, slotStartMinutes) => {
    const end = slotStartMinutes + 10;
    return sessions.some(
      (s) =>
        s.subjectId === subjectId &&
        s.endMinutes != null &&
        s.endMinutes > slotStartMinutes &&
        s.startMinutes < end
    );
  };

  const TIMETABLE_GRAY = '#D3D3D3';

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

        {/* 2. 타이머 (누적 시·분·초, 과목 없이도 시작 가능) */}
        <View style={styles.timerBlock}>
          <Text style={styles.timerTime}>{formatHMS(getTotalDisplayMs())}</Text>
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
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 3. 투두리스트 | 타임테이블 수평 배치 */}
        <View style={styles.todoTimetableRow}>
          {/* 왼쪽: 투두리스트 */}
          <View style={styles.todoColumn}>
            <View style={styles.todoHeader}>
              <Text style={styles.todoTitle}>투두리스트</Text>
              <TouchableOpacity style={styles.todoAddBtn} onPress={() => setShowAddSubject(true)}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.todoAddBtnText}>과목 추가</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.todoList} showsVerticalScrollIndicator={false}>
              {subjects.map((sub) => {
                const subTasks = tasks.filter((t) => t.subjectId === sub.id);
                const totalMs = getSubjectTotalMs(sub.id);
                const isThisSubjectRunning = isRunning && activeSubjectId === sub.id;
                const totalStr = isThisSubjectRunning ? formatHMS(elapsedMs) : formatHMS(totalMs);
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
                              onPress={() => setTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                            >
                              {task.status === 'done' && <Ionicons name="checkmark" size={normalize(14)} color={colors.textWhite} />}
                            </TouchableOpacity>
                            <Text style={[styles.taskContent, task.status === 'done' && styles.taskContentDone]} numberOfLines={1}>{task.content}</Text>
                          </View>
                        ))}
                        <TouchableOpacity style={styles.todoAddUnderSubject} onPress={() => openAddTaskForSubject(sub.id)}>
                          <Text style={styles.todoAddUnderSubjectText}>+ 추가</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* 오른쪽: 타임테이블 (과목별 색상 블록) */}
          <View style={styles.timetableColumn}>
            <Text style={styles.timetableTitle}>공부 기록</Text>
            <View style={styles.timetableScroll} showsVerticalScrollIndicator={false}>
              {HOURS.map((rowIndex) => {
                const hour = (6 + rowIndex) % 24;
                const slotStartBase = hour * 60;
                return (
                  <View key={rowIndex} style={styles.timetableRow}>
                    <View style={styles.timetableHourCell}>
                      <Text style={styles.timetableHourText}>
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={styles.timetableSlotsRow}>
                      {[0, 10, 20, 30, 40, 50].map((m) => {
                        const slotStart = slotStartBase + m;
                        const isGray = isSlotForSubject(null, slotStart);
                        const subjectId = !isGray ? subjects.find((s) => isSlotForSubject(s.id, slotStart))?.id : null;
                        const color = isGray ? TIMETABLE_GRAY : (subjectId ? subjects.find((s) => s.id === subjectId)?.color : null);
                        return (
                          <View
                            key={m}
                            style={[
                              styles.timetableSlotCell,
                              color ? { backgroundColor: color } : null,
                            ]}
                          />
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

      <AddSubjectModal visible={showAddSubject} onClose={() => setShowAddSubject(false)} onAdd={addSubject} />
      <AddTaskModal
        visible={showAddTask}
        onClose={() => { setShowAddTask(false); setAddTaskSubjectId(null); }}
        onAdd={addTask}
        subjects={subjects}
        initialSubjectId={addTaskSubjectId}
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
