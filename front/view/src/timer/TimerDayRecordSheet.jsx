/**
 * 공부 잔디 — 지난 날짜 기록 시트 (투두리스트 | 타임테이블 탭 + 사진 저장)
 * 데이터는 useTimerDayRecord로 따로 불러오므로 타이머 본문(카드·탭)은 오늘 그대로 유지된다.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import Skeleton from '../../../components/common/Skeleton';
import { getSessionDurationMs } from './timerHelpers';
import { formatGrassDurationHm } from './studyGrassHelpers';
import { TimerPlannerTabBar } from './TimerPlannerTabs';
import TimerTodoList from './TimerTodoList';
import TimerTimetable from './TimerTimetable';

const SHEET_TABS = [
  { key: 'todo', label: '투두리스트' },
  { key: 'timetable', label: '타임테이블' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatSheetTitle(dayKey, seconds) {
  if (!dayKey) return '';
  const [y, m, d] = dayKey.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const duration = formatGrassDurationHm(seconds);
  const date = `${m}월 ${d}일 (${weekday})`;
  return duration ? `${date}  ${duration}` : date;
}

const noop = () => {};

export default function TimerDayRecordSheet({
  dayKey,
  seconds,
  loading,
  onClose,
  onSave,
  styles,
  normalize,
  displaySessions,
  displaySubjects,
  displayTasks,
  collapsedSubjects,
  toggleSubjectCollapsed,
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = height * 0.75;
  const visible = dayKey != null;
  const [tab, setTab] = useState('todo');
  const [saving, setSaving] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setTab('todo');
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, dayKey, progress]);

  const close = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSave = async () => {
    if (loading || saving) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const getSubjectTotalMs = (subjectId) =>
    displaySessions
      .filter((s) => s.subjectId === subjectId)
      .reduce((sum, s) => sum + getSessionDurationMs(s), 0);

  const isEmpty = displaySubjects.length === 0 && displaySessions.length === 0;
  const saveDisabled = loading || saving;

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.dayRecordSkeleton}>
          {[0, 1, 2].map((idx) => (
            <Skeleton
              key={`day-record-skel-${idx}`}
              width="100%"
              height={normalize(64)}
              borderRadius={normalize(14)}
            />
          ))}
        </View>
      );
    }
    if (tab === 'timetable') {
      return (
        <TimerTimetable
          styles={styles}
          displaySessions={displaySessions}
          displaySubjects={displaySubjects}
          dayKey={dayKey}
          guideTarget={false}
        />
      );
    }
    if (isEmpty) {
      return <Text style={styles.dayRecordEmptyText}>이 날은 기록이 없어요</Text>;
    }
    return (
      <TimerTodoList
        styles={styles}
        normalize={normalize}
        liveExtraMs={0}
        isViewingToday={false}
        isRunning={false}
        activeSubjectId={null}
        displaySubjects={displaySubjects}
        displayTasks={displayTasks}
        getSubjectTotalMs={getSubjectTotalMs}
        collapsedSubjects={collapsedSubjects}
        toggleSubjectCollapsed={toggleSubjectCollapsed}
        startForSubject={noop}
        pauseTimer={noop}
        setShowAddSubject={noop}
        openAddTaskForSubject={noop}
        setTaskStatus={noop}
        guideTarget={false}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.dayRecordBackdrop}>
        <TouchableOpacity
          style={styles.dayRecordBackdropTouch}
          activeOpacity={1}
          onPress={close}
        />
      </View>
      <Animated.View
        style={[
          styles.dayRecordSheet,
          {
            height: sheetHeight,
            paddingBottom: Math.max(insets.bottom, normalize(12)),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sheetHeight, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.dayRecordHeader}>
          <Text style={styles.dayRecordTitle} numberOfLines={1}>
            {formatSheetTitle(dayKey, seconds)}
          </Text>
          <View style={styles.dayRecordHeaderActions}>
            {loading || !isEmpty ? (
              <TouchableOpacity
                style={[styles.dayRecordSaveBtn, saveDisabled && styles.dayRecordSaveBtnDisabled]}
                onPress={handleSave}
                disabled={saveDisabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="이 날짜 사진 저장"
              >
                <Feather name="download" size={normalize(18)} color={colors.textLight4} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.dayRecordCloseBtn}
              onPress={close}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="닫기"
            >
              <Ionicons name="close" size={normalize(22)} color={colors.textLight4} />
            </TouchableOpacity>
          </View>
        </View>
        <TimerPlannerTabBar
          value={tab}
          onChange={setTab}
          styles={styles}
          tabs={SHEET_TABS}
        />
        <ScrollView
          style={styles.dayRecordScroll}
          showsVerticalScrollIndicator={false}
        >
          {renderBody()}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
