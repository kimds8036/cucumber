/**
 * timerModals.jsx
 * 타이머 화면에서 사용하는 모달들만 분리:
 * - AddSubjectModal
 * - AddTaskModal
 * - CalendarModal
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { getNormalize, createTimerModalsStyles } from '../../styles/timer';
import { getTimerDayKey } from '../../utils/timerStorage';
import Skeleton from '../../components/common/Skeleton';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

// ── 공통 상수/유틸 ───────────────────────────────────────────
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

const dateFromDayKey = (dayKey) => new Date(dayKey + 'T06:00:00');

function useTimerModalStyles() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const m = useMemo(() => createTimerModalsStyles(normalize), [normalize]);
  return { m, normalize };
}

// ── 과목 추가 모달 ────────────────────────────────────────
export const AddSubjectModal = ({ visible, onClose, onAdd }) => {
  const { m, normalize } = useTimerModalStyles();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    setReady(false);
    const timer = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(timer);
  }, [visible]);
  const translateY = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
      onEnd: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
    },
    [],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!visible) translateY.value = 0;
  }, [translateY, visible]);

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
  if (!ready) {
    return (
      <Modal transparent animationType="fade" onRequestClose={onClose}>
        <View style={m.wrapper}>
          <View style={m.centered}>
            <View style={m.card}>
              <Skeleton width={110} height={18} borderRadius={8} style={m.skelLineMb10} />
              <Skeleton width="100%" height={42} borderRadius={10} style={m.skelLineMb12} />
              <Skeleton width="100%" height={36} borderRadius={10} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={m.wrapper}>
          <TouchableOpacity
            style={m.overlay}
            onPress={onClose}
            activeOpacity={1}
          />
          <Animated.View style={[m.centered, animStyle]}>
            <View style={m.card}>
            <Text style={m.title}>과목 추가</Text>
            <TextInput
              style={m.input}
              placeholder="과목명"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <View style={m.colorRow}>
              <View style={m.colorLabelRow}>
                <Text style={[m.label, m.labelNoMargin]}>색상</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={m.colorScroll}
              >
                <View style={m.colorWrap}>
                  {SUBJECT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setColor(c)}
                      style={[
                        m.colorDot,
                        { backgroundColor: c },
                        color === c && m.colorDotSelected,
                      ]}
                    />
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity
                onPress={pickRandom}
                style={m.randomBtn}
              >
                <Ionicons
                  name="shuffle"
                  size={normalize(14)}
                  color={colors.textSecondary}
                  style={m.randomIcon}
                />
                <Text style={m.randomText}>랜덤</Text>
              </TouchableOpacity>
            </View>
              <View style={m.row}>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                <Text style={m.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  m.primaryBtn,
                  !name.trim() && m.btnDisabled,
                ]}
                onPress={handleAdd}
                disabled={!name.trim()}
              >
                <Text style={m.primaryText}>추가</Text>
              </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── 할일 추가 모달 ────────────────────────────────────────
export const AddTaskModal = ({
  visible,
  onClose,
  onAdd,
  subjects,
  initialSubjectId,
}) => {
  const { m, normalize } = useTimerModalStyles();
  const [content, setContent] = useState('');
  const [ready, setReady] = useState(false);
  const effectiveSubjectId = initialSubjectId ?? subjects[0]?.id ?? null;
  const translateY = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
      onEnd: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
    },
    [],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!visible) setContent('');
  }, [visible]);
  useEffect(() => {
    if (!visible) return undefined;
    setReady(false);
    const timer = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) translateY.value = 0;
  }, [translateY, visible]);

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
  if (!ready) {
    return (
      <Modal transparent animationType="fade" onRequestClose={handleClose}>
        <View style={m.wrapper}>
          <View style={m.centered}>
            <View style={m.card}>
              <Skeleton width={110} height={18} borderRadius={8} style={m.skelLineMb10} />
              <Skeleton width="100%" height={66} borderRadius={10} style={m.skelLineMb12} />
              <Skeleton width="100%" height={36} borderRadius={10} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  if (subjects.length === 0) {
    return (
      <Modal transparent animationType="fade" onRequestClose={handleClose}>
        <View style={m.wrapper}>
          <TouchableOpacity
            style={m.overlay}
            onPress={handleClose}
            activeOpacity={1}
          />
          <View style={m.centered}>
            <View style={m.card}>
              <Text style={m.title}>할일 추가</Text>
              <Text style={m.emptySubjectHint}>
                과목을 먼저 추가해주세요.
              </Text>
              <TouchableOpacity
                style={m.primaryBtn}
                onPress={handleClose}
              >
                <Text style={m.primaryText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={m.wrapper}>
          <TouchableOpacity
            style={m.overlay}
            onPress={handleClose}
            activeOpacity={1}
          />
          <Animated.View style={[m.centered, animStyle]}>
            <View style={m.card}>
            <Text style={m.title}>할일 추가</Text>
            <Text style={m.label}>내용</Text>
            <TextInput
              style={[m.input, m.inputMultiline]}
              placeholder="할 일 내용"
              placeholderTextColor={colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
            />
              <View style={m.row}>
              <TouchableOpacity
                style={m.cancelBtn}
                onPress={handleClose}
              >
                <Text style={m.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  m.primaryBtn,
                  !content.trim() && m.btnDisabled,
                ]}
                onPress={handleAdd}
                disabled={!content.trim()}
              >
                <Text style={m.primaryText}>추가</Text>
              </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── 달력 모달 ─────────────────────────────────────────────
export const CalendarModal = ({ visible, onClose, currentDayKey, onSelectDay }) => {
  const { m, normalize } = useTimerModalStyles();
  const [yearMonth, setYearMonth] = useState(() => {
    const d = dateFromDayKey(currentDayKey || getTimerDayKey(new Date()));
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visible && currentDayKey) {
      const d = dateFromDayKey(currentDayKey);
      setYearMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [visible, currentDayKey]);
  useEffect(() => {
    if (!visible) return undefined;
    setReady(false);
    const timer = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(timer);
  }, [visible]);

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
  if (!ready) {
    return (
      <Modal transparent animationType="fade" onRequestClose={onClose}>
        <View style={m.wrapper}>
          <View style={[m.centered, m.centeredJustify]}>
            <View style={[m.card, m.cardMaxWidth]}>
              <Skeleton width={140} height={18} borderRadius={8} style={m.skelTitleMb14} />
              {[0, 1, 2, 3].map((idx) => (
                <Skeleton key={`calendar-skel-${idx}`} width="100%" height={34} borderRadius={8} style={m.skelLineMb8} />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.wrapper}>
        <TouchableOpacity
          style={m.overlay}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[m.centered, m.centeredJustify]}>
          <View style={[m.card, m.cardMaxWidth]}>
            <View style={m.calendarHeader}>
              <TouchableOpacity onPress={goPrevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={normalize(20)} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={m.calendarMonthTitle}>
                {yearMonth.year}년 {yearMonth.month + 1}월
              </Text>
              <TouchableOpacity onPress={goNextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name="chevron-forward"
                  size={normalize(20)}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={m.weekRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <View key={d} style={m.weekDayCell}>
                  <Text style={m.weekDayText}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            <View style={m.calendarGrid}>
              {days.map((day, idx) => {
                const key = day ? getDayKey(day) : null;
                const isSelected = key && key === currentDayKey;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={m.dayCell}
                    disabled={!day}
                    onPress={() => {
                      const selected = getDayKey(day);
                      if (selected) {
                        onSelectDay(selected);
                        onClose();
                      }
                    }}
                  >
                    {day && (
                      <View
                        style={[
                          m.dayInner,
                          isSelected && m.dayInnerSelected,
                        ]}
                      >
                        <Text
                          style={[
                            m.dayText,
                            isSelected && m.dayTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    )}
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

