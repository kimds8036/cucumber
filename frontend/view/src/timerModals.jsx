/**
 * timerModals.jsx
 * 타이머 화면에서 사용하는 모달들만 분리:
 * - AddSubjectModal
 * - AddTaskModal
 * - CalendarModal
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { getTimerDayKey } from '../../utils/timerStorage';
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

const modalStyles = {
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    width: '86%',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  colorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  colorScroll: {
    flexGrow: 0,
    marginLeft: 8,
  },
  colorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#333',
    borderWidth: 2,
  },
  randomBtn: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  randomIcon: {
    marginTop: 0,
  },
  randomText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
  },
  btnDisabled: {
    opacity: 0.4,
  },
};

// ── 과목 추가 모달 ────────────────────────────────────────
export const AddSubjectModal = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
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
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={modalStyles.wrapper}>
          <TouchableOpacity
            style={modalStyles.overlay}
            onPress={onClose}
            activeOpacity={1}
          />
          <Animated.View style={[modalStyles.centered, animStyle]}>
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
              <View style={modalStyles.colorLabelRow}>
                <Text style={[modalStyles.label, { marginBottom: 0 }]}>색상</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={modalStyles.colorScroll}
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
                <Ionicons
                  name="shuffle"
                  size={14}
                  color={colors.textSecondary}
                  style={modalStyles.randomIcon}
                />
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
  const [content, setContent] = useState('');
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={modalStyles.wrapper}>
          <TouchableOpacity
            style={modalStyles.overlay}
            onPress={handleClose}
            activeOpacity={1}
          />
          <Animated.View style={[modalStyles.centered, animStyle]}>
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
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── 달력 모달 ─────────────────────────────────────────────
export const CalendarModal = ({ visible, onClose, currentDayKey, onSelectDay }) => {
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
              <TouchableOpacity onPress={goPrevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {yearMonth.year}년 {yearMonth.month + 1}월
              </Text>
              <TouchableOpacity onPress={goNextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <View
                  key={d}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: colors.textSecondary,
                    }}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((day, idx) => {
                const key = day ? getDayKey(day) : null;
                const isSelected = key && key === currentDayKey;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      width: '14.285%',
                      aspectRatio: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 4,
                    }}
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
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: isSelected ? '700' : '400',
                            color: isSelected ? colors.textWhite : colors.textPrimary,
                          }}
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

