import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { colors, TIMETABLE_SUBJECT_COLORS } from '../../../styles/colors';
import { getNormalize } from '../../../styles/mypage.style';
import { api } from '../../../utils/api';
import AppPopupModal from '../../../components/common/AppPopupModal';
import styles, { DAYS, createManualTimetableScreenStyles } from './timetable.style';
import { TIMETABLE_DUMMY } from './TimetableDummy';

const MANUAL_TS_MAX_PERIOD = 10;

const COLORS = {
  ...colors,
  textDisabled: colors.textLight20,
};

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

export default function TimetableScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const mt = useMemo(() => createManualTimetableScreenStyles(normalize), [normalize]);

  const [keyword, setKeyword] = useState('');
  const [timetable, setTimetable] = useState({});
  const [paintSubjectId, setPaintSubjectId] = useState(null);
  const [schoolGradeText, setSchoolGradeText] = useState('-');
  const [showDoneAddedModal, setShowDoneAddedModal] = useState(false);

  const resolveTimetableCacheKey = useCallback(async () => {
    if (route?.params?.timetableCacheKey) {
      return route.params.timetableCacheKey;
    }
    try {
      const res = await api.get('/api/auth/me');
      const me = res.data?.data;
      const userScope =
        me?.id != null ? String(me.id) : me?.username || me?.email || null;
      if (userScope) return `@mypage_timetable_cache_v1:${userScope}`;
    } catch (e) {
      console.warn('[TimetableScreen] 시간표 캐시 키 계산 실패:', e?.message || e);
    }
    return '@mypage_timetable_cache_v1';
  }, [route?.params?.timetableCacheKey]);

  const termTitle = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const semester = month >= 2 && month <= 7 ? '1학기' : '2학기';
    return `${year}년 ${semester}`;
  }, []);

  const filteredSubjects = useMemo(() => {
    const q = keyword.trim();
    if (!q) return TIMETABLE_DUMMY;
    return TIMETABLE_DUMMY.filter((subject) => subject.name.includes(q));
  }, [keyword]);

  const colorSeed = 0;
  const safeTimetable = timetable || {};
  const hasTimetableEntries = useMemo(
    () => Object.keys(safeTimetable).length > 0,
    [safeTimetable],
  );
  const periods = useMemo(
    () => Array.from({ length: MANUAL_TS_MAX_PERIOD }, (_, i) => i + 1),
    [],
  );

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

  const getCellContent = (day, period) => safeTimetable[`${day}-${period}`] || '';

  const getCellColor = (content) => {
    const key = normalizeSubject(content);
    if (!key) return null;
    return (
      subjectColorMap[key] ||
      TIMETABLE_SUBJECT_COLORS[getSubjectColorIndex(key)]
    );
  };

  const handleCellPress = useCallback(
    (day, period) => {
      if (paintSubjectId == null) return;
      const sub = TIMETABLE_DUMMY.find((s) => s.id === paintSubjectId);
      if (!sub) return;
      setTimetable((prev) => ({
        ...prev,
        [`${day}-${period}`]: sub.name,
      }));
    },
    [paintSubjectId],
  );

  const handleCellLongPress = useCallback((day, period) => {
    const key = `${day}-${period}`;
    setTimetable((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleDone = async () => {
    const nextTimetable = timetable || {};
    const hasEntries = Object.keys(nextTimetable).length > 0;
    if (!hasEntries) return;

    try {
      const keyToUse = await resolveTimetableCacheKey();
      await AsyncStorage.setItem(
        keyToUse,
        JSON.stringify({
          ts: Date.now(),
          timetable: nextTimetable,
          clearedByUser: false,
        }),
      );
      setShowDoneAddedModal(true);
    } catch (error) {
      console.warn(
        '[TimetableScreen] MyPage 시간표 캐시 저장 실패:',
        error?.message || error,
      );
    }
  };

  const handleConfirmDoneAddedModal = useCallback(() => {
    setShowDoneAddedModal(false);
    navigation.navigate('Main', { initialTab: 'mypage' });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;

    const fetchSchoolAndGrade = async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (!mounted) return;

        const me = res.data?.data;
        const schoolName = me?.school?.name || '-';
        const gradeText = me?.grade ? `${me.grade}학년` : '';
        setSchoolGradeText(gradeText ? `${schoolName} · ${gradeText}` : schoolName);
      } catch (error) {
        if (mounted) {
          setSchoolGradeText('-');
        }
        console.warn(
          '[TimetableScreen] 사용자 학교/학년 조회 실패:',
          error?.response?.data || error?.message || error,
        );
      }
    };

    fetchSchoolAndGrade();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title={termTitle}
        onBack={() => navigation.goBack()}
        rightButtonText="완료"
        onRightPress={handleDone}
        rightDisabled={!hasTimetableEntries}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={mt.manualTsPageBody}>
          <Text style={mt.manualTsHint}>
          아래 목록에서 과목을 선택한 후 시간표 칸을 눌러 배치하세요. {'\n'}칸을 길게 누르면 제거됩니다.
          </Text>

          <View style={mt.manualTsWrapper}>
            <View style={mt.manualTsTimetableContainer}>
              <View style={mt.manualTsGrid} collapsable={false}>
                <ScrollView
                  style={mt.manualTsPeriodScroll}
                  contentContainerStyle={mt.manualTsPeriodScrollContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  alwaysBounceVertical={false}
                  overScrollMode="never"
                >
                  <View style={mt.manualTsDaysRow}>
                    <View style={mt.manualTsPeriodHeaderCell} />
                    {DAYS.map((day) => (
                      <View key={day} style={mt.manualTsDayCell}>
                        <Text style={mt.manualTsDayText}>{day}</Text>
                      </View>
                    ))}
                  </View>

                  {periods.map((period) => (
                    <View key={period} style={mt.manualTsRow}>
                      <View style={mt.manualTsPeriodCell}>
                        <Text style={mt.manualTsPeriodText}>{period}</Text>
                      </View>
                      {DAYS.map((day) => {
                        const content = getCellContent(day, period);
                        const paintReady = paintSubjectId != null && !content;
                        const cellStyle = [
                          mt.manualTsClassCell,
                          content ? mt.manualTsClassCellFilled : null,
                          paintReady ? mt.manualTsClassCellPaintReady : null,
                          content ? { backgroundColor: getCellColor(content) } : null,
                        ];
                        return (
                          <TouchableOpacity
                            key={`${day}-${period}`}
                            activeOpacity={0.65}
                            style={cellStyle}
                            onPress={() => handleCellPress(day, period)}
                            onLongPress={() => handleCellLongPress(day, period)}
                            delayLongPress={380}
                          >
                            <Text
                              style={[
                                mt.manualTsClassCellText,
                                content ? mt.manualTsClassCellTextFilled : null,
                              ]}
                              lineBreakMode="wordWrapping"
                              lineBreakStrategyIOS="hangul-word"
                            >
                              {content}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <ScrollView
            style={mt.manualTsSubjectSectionScroll}
            contentContainerStyle={mt.manualTsSubjectSectionScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="과목 검색"
              placeholderTextColor={COLORS.textSecondary}
              style={mt.manualTsSearchInput}
            />

            <View style={mt.manualTsSubjectList}>
              {filteredSubjects.map((subject) => {
                const paintSelected = paintSubjectId === subject.id;
                const onTimetable = Object.values(safeTimetable).includes(subject.name);
                const dotColor = onTimetable
                  ? getCellColor(subject.name) || COLORS.textLight10
                  : COLORS.textLight10;

                return (
                  <TouchableOpacity
                    key={subject.id}
                    activeOpacity={0.75}
                    style={[
                      mt.manualTsSubjectRow,
                      paintSelected && mt.manualTsSubjectRowPaintSelected,
                    ]}
                    onPress={() =>
                      setPaintSubjectId((prev) => (prev === subject.id ? null : subject.id))
                    }
                  >
                    <View style={[mt.manualTsSubjectDot, { backgroundColor: dotColor }]} />
                    <View style={mt.manualTsSubjectBody}>
                      <Text style={mt.manualTsSubjectTitle}>{subject.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <AppPopupModal
        visible={showDoneAddedModal}
        onClose={() => setShowDoneAddedModal(false)}
      >
        <Text style={mt.manualTsDoneModalTitle}>시간표가 추가되었습니다.</Text>
        <View style={mt.manualTsDoneModalHintWrap}>
          <Text style={mt.manualTsDoneModalHintLine}>추후 시간표가 달라질 경우</Text>
          <View style={mt.manualTsDoneModalHintRow}>
            <Feather name="edit" size={normalize(16)} color={COLORS.textSecondary} />
            <Text style={mt.manualTsDoneModalHintAfterIcon}>
              버튼으로 편집할 수 있습니다.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={mt.manualTsDoneModalConfirmBtn}
          onPress={handleConfirmDoneAddedModal}
          activeOpacity={0.85}
        >
          <Text style={mt.manualTsDoneModalConfirmText}>확인</Text>
        </TouchableOpacity>
      </AppPopupModal>
    </SafeAreaView>
  );
}
