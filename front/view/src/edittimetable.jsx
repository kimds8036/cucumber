import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import SubHeader from '../frame/subHeader';
import {
  colors,
  fonts,
  fontSizes,
  TIMETABLE_SUBJECT_COLORS,
} from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import {
  DAYS,
  createEditTimetableScreenStyles,
  EDIT_TIMETABLE_INPUT_PLACEHOLDER_COLOR,
  editTsScreenChromeStyles,
  getEditTimetableAccordionMinFooterPadding,
  getEditTimetableKeyboardVerticalOffset,
} from '../../src/screens/timetable/timetable.style';
import { getMaxPeriodFromTimetableKeys } from '../../src/screens/timetable/periodUtils';

/** 빈 시간표일 때 격자에 보이는 최소 행 수 (1교시~여기까지) */
const EDIT_TS_GRID_INITIAL_MIN = 10;
/** 교시 선택 모달 범위 */
const EDIT_TS_PICKER_MIN = 1;
const EDIT_TS_PICKER_MAX = 20;

const normalizeSubject = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getSubjectColorIndex = (subject) => {
  const key = normalizeSubject(subject);
  if (!key) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash) % TIMETABLE_SUBJECT_COLORS.length;
};

/** MyPage 등에서 넘긴 existingTimetable 수정·삭제; 빈 칸에서도 탭해 과목 입력 가능 */
const EditTimetable = ({ navigation, route }) => {
  const { existingTimetable, onSave, timetableCacheKey, returnToMypage } =
    route.params || {};
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const et = useMemo(
    () => createEditTimetableScreenStyles(normalize),
    [normalize],
  );
  const scrollRef = useRef(null);

  const scrollAccordionAboveKeyboard = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [className, setClassName] = useState('');
  const [timetable, setTimetable] = useState(() =>
    existingTimetable && typeof existingTimetable === 'object'
      ? { ...existingTimetable }
      : {},
  );

  const initialMaxPeriod = useMemo(() => {
    const tt =
      existingTimetable && typeof existingTimetable === 'object'
        ? existingTimetable
        : {};
    const fromData = Math.max(
      EDIT_TS_GRID_INITIAL_MIN,
      getMaxPeriodFromTimetableKeys(tt, EDIT_TS_GRID_INITIAL_MIN),
    );
    return Math.min(EDIT_TS_PICKER_MAX, fromData);
  }, [existingTimetable]);

  const [maxPeriodCount, setMaxPeriodCount] = useState(initialMaxPeriod);

  useEffect(() => {
    setMaxPeriodCount(initialMaxPeriod);
  }, [initialMaxPeriod]);

  const periods = useMemo(
    () => Array.from({ length: maxPeriodCount }, (_, i) => i + 1),
    [maxPeriodCount],
  );

  const handleAddPeriodRow = useCallback(() => {
    setMaxPeriodCount((n) => (n >= EDIT_TS_PICKER_MAX ? n : n + 1));
  }, []);

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

  useEffect(() => {
    if (existingTimetable != null && typeof existingTimetable === 'object') {
      setTimetable({ ...existingTimetable });
    } else {
      setTimetable({});
    }
  }, [existingTimetable]);

  useEffect(() => {
    if (selectedDay == null || selectedPeriod == null) {
      setClassName('');
      return;
    }
    const key = `${selectedDay}-${selectedPeriod}`;
    setClassName(String(timetable[key] || '').trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timetable 제외: 입력 중 필드 덮어쓰기 방지
  }, [selectedDay, selectedPeriod]);

  const closeEditPanel = useCallback(() => {
    setSelectedDay(null);
    setSelectedPeriod(null);
    setClassName('');
  }, []);

  const pruneTimetableAbovePeriod = useCallback((cap, tt) => {
    const next = { ...tt };
    Object.keys(next).forEach((k) => {
      const m = k.match(/-(\d+)$/);
      if (m && Number(m[1]) > cap) delete next[k];
    });
    return next;
  }, []);

  useEffect(() => {
    if (selectedPeriod != null && selectedPeriod > maxPeriodCount) {
      closeEditPanel();
    }
  }, [maxPeriodCount, selectedPeriod, closeEditPanel]);

  const periodPickerItems = useMemo(
    () =>
      Array.from(
        { length: EDIT_TS_PICKER_MAX - EDIT_TS_PICKER_MIN + 1 },
        (_, i) => EDIT_TS_PICKER_MIN + i,
      ),
    [],
  );

  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [periodDraft, setPeriodDraft] = useState(EDIT_TS_GRID_INITIAL_MIN);

  /** 모달·휠에서 확정 시에만 호출 — 격자 칸 탭만 할 때는 호출되지 않음 */
  const handlePeriodPickerChange = useCallback(
    (itemValue) => {
      const p = Number(itemValue);
      if (!Number.isFinite(p)) return;
      const clamped = Math.min(
        EDIT_TS_PICKER_MAX,
        Math.max(EDIT_TS_PICKER_MIN, p),
      );
      setSelectedPeriod(clamped);
      setMaxPeriodCount((prev) => {
        if (clamped > prev) return clamped;
        if (clamped < prev) {
          setTimetable((tt) => pruneTimetableAbovePeriod(clamped, tt));
          return clamped;
        }
        return prev;
      });
    },
    [pruneTimetableAbovePeriod],
  );

  const openPeriodModal = () => {
    if (selectedPeriod == null) return;
    setPeriodDraft(selectedPeriod);
    setPeriodModalVisible(true);
  };

  const confirmPeriodModal = () => {
    handlePeriodPickerChange(periodDraft);
    setPeriodModalVisible(false);
  };

  const handleCellPress = (day, period) => {
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
    const timetableToSave = pruneTimetableAbovePeriod(
      maxPeriodCount,
      timetable,
    );
    try {
      if (onSave) {
        onSave(timetableToSave);
      }
      if (timetableCacheKey) {
        await AsyncStorage.setItem(
          timetableCacheKey,
          JSON.stringify({
            ts: Date.now(),
            timetable: timetableToSave,
            clearedByUser: false,
          }),
        );
      }
      setTimetable(timetableToSave);
    } catch (error) {
      console.error('시간표 저장 실패:', error);
    }

    Alert.alert('저장 완료', '시간표가 저장되었습니다.', [
      {
        text: '확인',
        onPress: () => {
          if (returnToMypage) {
            navigation.navigate('Main', { initialTab: 'mypage' });
            return;
          }
          navigation.goBack();
        },
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
                      filled
                        ? { backgroundColor: getCellColor(content) }
                        : null,
                      isSelected ? et.editTsClassCellSelected : null,
                    ];

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
                            filled ? et.editTsClassCellTextFilled : null,
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
                  })}
                </View>
              ))}

              <View style={et.editTsAddPeriodFooterRow}>
                <Pressable
                  style={et.editTsAddPeriodFooterCell}
                  onPress={handleAddPeriodRow}
                  disabled={maxPeriodCount >= EDIT_TS_PICKER_MAX}
                >
                  <View style={et.editTsAddPeriodFooterActions}>
                    <TouchableOpacity
                      style={et.editTsAddPeriodFooterIconBtn}
                      onPress={handleAddPeriodRow}
                      activeOpacity={0.7}
                      disabled={maxPeriodCount >= EDIT_TS_PICKER_MAX}
                    >
                      <Feather
                        name="plus"
                        size={normalize(16)}
                        color={colors.background2}
                        style={{
                          opacity:
                            maxPeriodCount >= EDIT_TS_PICKER_MAX ? 0.35 : 1,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>

      {selectionActive ? (
        <View style={et.editTsAccordion}>
          <View style={et.editTsAccordionBody}>
            <View
              style={[
                et.editTsAccordionCellTitle,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                },
              ]}
            >
              <Text style={[et.editTsAccordionCellTitle, { marginBottom: 0 }]}>
                {selectedDay}요일 {selectedPeriod}교시
              </Text>
            </View>
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
        </View>
      ) : null}
    </ScrollView>
  );

  return (
    <View style={editTsScreenChromeStyles.rootFill}>
      <Modal
        visible={periodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.overlay }}
            activeOpacity={1}
            onPress={() => setPeriodModalVisible(false)}
          />
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: normalize(14),
              borderTopRightRadius: normalize(14),
              paddingBottom: Math.max(insets.bottom, normalize(12)),
              paddingTop: normalize(12),
              paddingHorizontal: normalize(16),
            }}
          >
            <Picker
              selectedValue={periodDraft}
              onValueChange={(v) => setPeriodDraft(Number(v))}
              {...(Platform.OS === 'android' ? { mode: 'dialog' } : {})}
              style={
                Platform.OS === 'ios'
                  ? { width: '100%' }
                  : { width: '100%', height: normalize(180) }
              }
              itemStyle={
                Platform.OS === 'ios'
                  ? {
                      fontFamily: fonts.bold,
                      fontSize: normalize(fontSizes.xl),
                      color: colors.textPrimary,
                    }
                  : undefined
              }
            >
              {periodPickerItems.map((p) => (
                <Picker.Item key={p} label={`${p}교시`} value={p} />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={confirmPeriodModal}
              style={{
                marginTop: normalize(8),
                paddingVertical: normalize(14),
                borderRadius: normalize(10),
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: normalize(fontSizes.xl),
                  color: colors.background,
                }}
              >
                완료
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
