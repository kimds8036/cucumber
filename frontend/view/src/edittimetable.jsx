import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { TIMETABLE_SUBJECT_COLORS } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import {
  DAYS,
  createEditTimetableScreenStyles,
  EDIT_TIMETABLE_INPUT_PLACEHOLDER_COLOR,
  editTsScreenChromeStyles,
  getEditTimetableAccordionMinFooterPadding,
  getEditTimetableKeyboardVerticalOffset,
} from '../../src/screens/timetable/timetable.style';

const EDIT_TS_MAX_PERIOD = 10;

const normalizeSubject = (value) => String(value || '').trim().toLowerCase();

const getSubjectColorIndex = (subject) => {
  const key = normalizeSubject(subject);
  if (!key) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash) % TIMETABLE_SUBJECT_COLORS.length;
};

/** MyPage 등에서 넘긴 existingTimetable 만 수정·삭제 (빈 칸 과목 추가 불가) */
const EditTimetable = ({ navigation, route }) => {
  const { existingTimetable, onSave, timetableCacheKey } = route.params || {};
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const et = useMemo(() => createEditTimetableScreenStyles(normalize), [normalize]);
  const scrollRef = useRef(null);

  const scrollAccordionAboveKeyboard = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [accordionExpanded, setAccordionExpanded] = useState(true);
  const [className, setClassName] = useState('');
  const [timetable, setTimetable] = useState(() =>
    existingTimetable && typeof existingTimetable === 'object'
      ? { ...existingTimetable }
      : {},
  );

  const periods = useMemo(
    () => Array.from({ length: EDIT_TS_MAX_PERIOD }, (_, i) => i + 1),
    [],
  );
  const colorSeed = 0;
  const safeTimetable = timetable || {};

  const subjectColorMap = useMemo(() => {
    const map = {};
    const used = new Set();
    const subjects = [
      ...new Set(
        Object.values(safeTimetable)
          .map((v) => normalizeSubject(v))
          .filter(Boolean),
      ),
    ];

    subjects.forEach((subject) => {
      const base = getSubjectColorIndex(subject);
      let idx = base;
      for (let step = 0; step < TIMETABLE_SUBJECT_COLORS.length; step += 1) {
        idx = (base + colorSeed + step) % TIMETABLE_SUBJECT_COLORS.length;
        if (!used.has(idx)) break;
      }
      used.add(idx);
      map[subject] = TIMETABLE_SUBJECT_COLORS[idx];
    });

    return map;
  }, [safeTimetable, colorSeed]);

  const getCellColor = (content) => {
    const key = normalizeSubject(content);
    if (!key) return null;
    return (
      subjectColorMap[key] ||
      TIMETABLE_SUBJECT_COLORS[getSubjectColorIndex(key)]
    );
  };

  const hasEditableCells = useCallback((tt) => {
    if (!tt || typeof tt !== 'object') return false;
    return Object.keys(tt).some((k) => String(tt[k] || '').trim().length > 0);
  }, []);

  useEffect(() => {
    if (!hasEditableCells(existingTimetable)) {
      Alert.alert('알림', '수정할 시간표가 없습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setTimetable({ ...existingTimetable });
  }, [existingTimetable, hasEditableCells, navigation]);

  useEffect(() => {
    if (selectedDay == null || selectedPeriod == null) {
      setClassName('');
      return;
    }
    const key = `${selectedDay}-${selectedPeriod}`;
    setClassName(String(timetable[key] || '').trim());
    setAccordionExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timetable 제외: 입력 중 필드 덮어쓰기 방지
  }, [selectedDay, selectedPeriod]);

  const closeEditPanel = () => {
    setSelectedDay(null);
    setSelectedPeriod(null);
    setClassName('');
    setAccordionExpanded(true);
  };

  const handleCellPress = (day, period) => {
    const key = `${day}-${period}`;
    const current = String(timetable[key] || '').trim();
    if (!current) return;

    setSelectedDay(day);
    setSelectedPeriod(period);
  };

  const handleConfirmEdit = () => {
    if (className.trim() === '') {
      Alert.alert('알림', '과목명을 입력해주세요.');
      return;
    }

    const key = `${selectedDay}-${selectedPeriod}`;
    setTimetable((prev) => ({
      ...prev,
      [key]: className.trim(),
    }));

    closeEditPanel();
  };

  const handleDeleteClass = () => {
    const key = `${selectedDay}-${selectedPeriod}`;
    setTimetable((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    closeEditPanel();
  };

  const handleSave = async () => {
    try {
      if (onSave) {
        onSave(timetable);
      }
      if (timetableCacheKey) {
        await AsyncStorage.setItem(
          timetableCacheKey,
          JSON.stringify({
            ts: Date.now(),
            timetable,
            clearedByUser: false,
          }),
        );
      }
    } catch (error) {
      console.error('시간표 저장 실패:', error);
    }

    Alert.alert('저장 완료', '시간표가 저장되었습니다.', [
      {
        text: '확인',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const getCellContent = (day, period) => {
    const key = `${day}-${period}`;
    return timetable[key] || '';
  };

  const selectionActive = selectedDay != null && selectedPeriod != null;

  const scrollPaddingBottom = Math.max(
    insets.bottom,
    getEditTimetableAccordionMinFooterPadding(normalize),
  );

  /** iOS: KeyboardAvoidingView 와 겹치면 키보드 높이가 이중 적용되어 큰 빈 공간이 생김 → ScrollView inset 만 사용 */
  const scrollViewEl = (
    <ScrollView
      ref={scrollRef}
      style={et.editTsKeyboardScroll}
      contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      showsVerticalScrollIndicator={false}
    >
      <View style={et.editTsPageBody}>
        <View style={et.editTsWrapper}>
          <View style={et.editTsTimetableContainer}>
            <View style={et.editTsGrid} collapsable={false}>
              <View style={et.editTsDaysRow}>
                <View style={et.editTsPeriodHeaderCell} />
                {DAYS.map((day) => (
                  <View key={day} style={et.editTsDayCell}>
                    <Text style={et.editTsDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {periods.map((period) => (
                <View key={period} style={et.editTsRow}>
                  <View style={et.editTsPeriodCell}>
                    <Text style={et.editTsPeriodText}>{period}</Text>
                  </View>
                  {DAYS.map((day) => {
                    const content = getCellContent(day, period);
                    const filled = Boolean(String(content).trim());
                    const isSelected =
                      selectionActive &&
                      selectedDay === day &&
                      selectedPeriod === period;
                    const cellStyle = [
                      et.editTsClassCell,
                      filled ? et.editTsClassCellFilled : null,
                      filled ? { backgroundColor: getCellColor(content) } : null,
                      filled && isSelected ? et.editTsClassCellSelected : null,
                    ];

                    if (filled) {
                      return (
                        <TouchableOpacity
                          key={`${day}-${period}`}
                          activeOpacity={0.65}
                          style={cellStyle}
                          onPress={() => handleCellPress(day, period)}
                        >
                          <Text
                            style={[
                              et.editTsClassCellText,
                              et.editTsClassCellTextFilled,
                            ]}
                            pointerEvents="none"
                            lineBreakMode="wordWrapping"
                            lineBreakStrategyIOS="hangul-word"
                            numberOfLines={2}
                          >
                            {content}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <View key={`${day}-${period}`} style={cellStyle}>
                        <Text
                          style={et.editTsClassCellText}
                          pointerEvents="none"
                          numberOfLines={2}
                        >
                          {content}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {selectionActive ? (
        <View style={et.editTsAccordion}>
          <View style={et.editTsAccordionHeader}>
            <Text style={et.editTsAccordionHeaderTitle}>
              {selectedDay}요일 {selectedPeriod}교시
            </Text>
          </View>

          {accordionExpanded ? (
            <View style={et.editTsAccordionBody}>
              <TextInput
                style={et.editTsAccordionInput}
                placeholder="과목명"
                placeholderTextColor={EDIT_TIMETABLE_INPUT_PLACEHOLDER_COLOR}
                value={className}
                onChangeText={setClassName}
                onFocus={scrollAccordionAboveKeyboard}
              />
              <View style={et.editTsAccordionActions}>
                <TouchableOpacity
                  style={[et.editTsAccordionBtn, et.editTsAccordionBtnMuted]}
                  onPress={closeEditPanel}
                  activeOpacity={0.85}
                >
                  <Text style={et.editTsAccordionBtnTextMuted}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[et.editTsAccordionBtn, et.editTsAccordionBtnDanger]}
                  onPress={handleDeleteClass}
                  activeOpacity={0.85}
                >
                  <Text style={et.editTsAccordionBtnTextDanger}>삭제</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[et.editTsAccordionBtn, et.editTsAccordionBtnPrimary]}
                  onPress={handleConfirmEdit}
                  activeOpacity={0.85}
                >
                  <Text style={et.editTsAccordionBtnTextPrimary}>적용</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );

  if (!hasEditableCells(existingTimetable)) {
    return (
      <View style={editTsScreenChromeStyles.rootFill}>
        <SafeAreaView style={editTsScreenChromeStyles.safeFill} edges={['top']} />
      </View>
    );
  }

  return (
    <View style={editTsScreenChromeStyles.rootFill}>
      <SafeAreaView style={editTsScreenChromeStyles.safeFill} edges={['top']}>
        {Platform.OS === 'ios' ? (
          <View style={et.editTsKeyboardRoot}>
            <SubHeader
              title="시간표 편집"
              onBack={() => navigation.goBack()}
              rightButtonText="저장"
              onRightPress={handleSave}
            />
            {scrollViewEl}
          </View>
        ) : (
          <KeyboardAvoidingView
            style={et.editTsKeyboardRoot}
            behavior="padding"
            keyboardVerticalOffset={getEditTimetableKeyboardVerticalOffset()}
          >
            <SubHeader
              title="시간표 편집"
              onBack={() => navigation.goBack()}
              rightButtonText="저장"
              onRightPress={handleSave}
            />
            {scrollViewEl}
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
};

export default EditTimetable;
