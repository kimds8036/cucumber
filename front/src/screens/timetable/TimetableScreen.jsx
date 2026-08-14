import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import ViewShot from 'react-native-view-shot';
import {
  saveImageUriToGallery,
  alertGallerySaveFailure,
} from '../../../utils/saveImageToGallery';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { getMaxPeriodFromTimetableKeys } from './periodUtils';
import { classifyTimetableCellValue } from '../../../utils/timetableAnomaly';
import styles, {
  DAYS,
  createManualTimetableScreenStyles,
} from './timetable.style';

/** 기본으로 보이는 교시 수(행) */
const MANUAL_TS_INITIAL_VISIBLE_PERIODS = 10;
/** + 버튼으로 늘릴 수 있는 교시 상한 */
const MANUAL_TS_MAX_PERIODS = 20;

function computeVisiblePeriodCount(timetable) {
  const tt =
    timetable && typeof timetable === 'object' && !Array.isArray(timetable)
      ? timetable
      : {};
  const fromData = getMaxPeriodFromTimetableKeys(
    tt,
    MANUAL_TS_INITIAL_VISIBLE_PERIODS,
  );
  return Math.min(
    MANUAL_TS_MAX_PERIODS,
    Math.max(MANUAL_TS_INITIAL_VISIBLE_PERIODS, fromData),
  );
}

const COLORS = {
  ...colors,
  textDisabled: colors.textLight20,
};

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

/** API 시간표 맵에서 과목명 유니크 목록 (정규화 키 기준, 표시는 첫 원문). */
function dedupeSubjectsFromTimetable(timetable) {
  const map = new Map();
  for (const v of Object.values(timetable || {})) {
    const raw = String(v ?? '').trim();
    if (!raw) continue;
    const key = normalizeSubject(raw);
    if (!key) continue;
    if (!map.has(key)) map.set(key, raw);
  }
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b, 'ko'))
    .map(([id, name]) => ({ id, name }));
}

function subjectsFromApiList(subjectList) {
  const map = new Map();
  for (const name of subjectList || []) {
    const raw = String(name ?? '').trim();
    if (!raw) continue;
    const key = normalizeSubject(raw);
    if (!key) continue;
    if (!map.has(key)) map.set(key, raw);
  }
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'ko'))
    .map(([id, name]) => ({ id, name }));
}

export default function TimetableScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const mt = useMemo(
    () => createManualTimetableScreenStyles(normalize),
    [normalize],
  );

  const [keyword, setKeyword] = useState('');
  const [timetable, setTimetable] = useState(() => {
    const raw = route?.params?.initialTimetable;
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...raw }
      : {};
  });
  const [paintSubjectId, setPaintSubjectId] = useState(null);
  const [schoolGradeText, setSchoolGradeText] = useState('-');
  const [showSaveImageModal, setShowSaveImageModal] = useState(false);
  const [profileScopeOk, setProfileScopeOk] = useState(
    () => route?.params?.timetableScope == null,
  );
  const [visiblePeriodCount, setVisiblePeriodCount] = useState(() =>
    computeVisiblePeriodCount(route?.params?.initialTimetable),
  );
  const captureTimetableRef = useRef(null);

  const initialTimetableSnapshot = useMemo(() => {
    const raw = route?.params?.initialTimetable;
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...raw }
      : {};
  }, [route?.params?.initialTimetable]);

  const routeSubjectList = useMemo(() => {
    const raw = route?.params?.subjectList;
    return Array.isArray(raw) ? raw.filter((s) => String(s || '').trim()) : [];
  }, [route?.params?.subjectList]);

  const routeTimetableSerial = useMemo(
    () => JSON.stringify(route?.params?.initialTimetable ?? null),
    [route?.params?.initialTimetable],
  );

  useEffect(() => {
    const raw = route?.params?.initialTimetable;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      setTimetable({ ...raw });
    } else {
      setTimetable({});
    }
    setPaintSubjectId(null);
    setVisiblePeriodCount(computeVisiblePeriodCount(raw));
  }, [routeTimetableSerial]);

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
      console.warn(
        '[TimetableScreen] 시간표 캐시 키 계산 실패:',
        e?.message || e,
      );
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

  const apiSubjectList = useMemo(() => {
    if (!profileScopeOk) return [];
    const fromApi = subjectsFromApiList(routeSubjectList);
    const list =
      fromApi.length > 0
        ? fromApi
        : dedupeSubjectsFromTimetable(initialTimetableSnapshot);
    // 공휴일·휴업 등은 과목 팔레트에서 제외 (격자 셀에는 그대로 표시)
    return list.filter(
      (subject) => classifyTimetableCellValue(subject.name) !== 'holiday',
    );
  }, [initialTimetableSnapshot, profileScopeOk, routeSubjectList]);

  const filteredSubjects = useMemo(() => {
    const q = keyword.trim();
    if (!q) return apiSubjectList;
    return apiSubjectList.filter((subject) => subject.name.includes(q));
  }, [apiSubjectList, keyword]);

  const colorSeed = 0;
  const safeTimetable = timetable || {};
  const hasTimetableEntries = useMemo(
    () => Object.keys(safeTimetable).length > 0,
    [safeTimetable],
  );
  const periods = useMemo(
    () => Array.from({ length: visiblePeriodCount }, (_, i) => i + 1),
    [visiblePeriodCount],
  );

  const handleAddPeriodRow = useCallback(() => {
    setVisiblePeriodCount((n) => (n >= MANUAL_TS_MAX_PERIODS ? n : n + 1));
  }, []);

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

  const getCellContent = (day, period) =>
    safeTimetable[`${day}-${period}`] || '';

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
      const sub = apiSubjectList.find((s) => s.id === paintSubjectId);
      if (!sub) return;
      setTimetable((prev) => ({
        ...prev,
        [`${day}-${period}`]: sub.name,
      }));
    },
    [apiSubjectList, paintSubjectId],
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
    const hasAnySubject = Object.values(nextTimetable).some(
      (v) => String(v ?? '').trim().length > 0,
    );
    if (!hasAnySubject) return;

    try {
      const keyToUse = await resolveTimetableCacheKey();
      // 과목이 하나라도 있으면 저장 전 교시 시간 설정(온보딩)으로 이동
      navigation.navigate('PeriodTimeSetup', {
        pendingTimetable: nextTimetable,
        sourceTimetable: nextTimetable,
        timetableCacheKey: keyToUse,
        suggestedPeriodCount: getMaxPeriodFromTimetableKeys(nextTimetable, 7),
      });
    } catch (error) {
      console.warn(
        '[TimetableScreen] 교시 시간 설정 이동 실패:',
        error?.message || error,
      );
    }
  };

  const timetableCacheKey = route?.params?.timetableCacheKey;

  const handleFooterReload = useCallback(() => {
    Alert.alert(
      '시간표 되돌리기',
      '학교에서 불러온 시간표로 다시 채울까요? 지금 화면에서 입력한 내용은 사라집니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '되돌리기',
          style: 'destructive',
          onPress: () => {
            setTimetable({ ...initialTimetableSnapshot });
            setPaintSubjectId(null);
            setVisiblePeriodCount(
              computeVisiblePeriodCount(initialTimetableSnapshot),
            );
          },
        },
      ],
    );
  }, [initialTimetableSnapshot]);

  const handleFooterEdit = useCallback(() => {
    if (!timetableCacheKey) {
      Alert.alert('알림', '시간표 수정 화면을 열 수 없습니다.');
      return;
    }
    navigation.navigate('EditTimetable', {
      existingTimetable: timetable || {},
      timetableCacheKey,
    });
  }, [navigation, timetable, timetableCacheKey]);

  const handleSaveAsImage = useCallback(async () => {
    if (!captureTimetableRef.current) return;
    try {
      const uri = await captureTimetableRef.current.capture();
      await saveImageUriToGallery(uri);
      setShowSaveImageModal(true);
    } catch (e) {
      alertGallerySaveFailure(e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchSchoolAndGrade = async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (!mounted) return;

        const me = res.data?.data;
        const schoolName = me?.school?.name || '-';
        const gradeText = me?.grade ? `${me.grade}학년` : '';
        setSchoolGradeText(
          gradeText ? `${schoolName} · ${gradeText}` : schoolName,
        );

        const scope = route?.params?.timetableScope;
        if (scope == null) {
          setProfileScopeOk(true);
        } else {
          const schoolMatch =
            String(me?.school?.id ?? '') === String(scope.schoolId ?? '');
          const gradeMatch =
            Number(me?.grade ?? NaN) === Number(scope.grade ?? NaN);
          setProfileScopeOk(schoolMatch && gradeMatch);
        }
      } catch (error) {
        if (mounted) {
          setSchoolGradeText('-');
          setProfileScopeOk(false);
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
  }, [route?.params?.timetableScope]);

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
            아래 목록에서 과목을 선택한 후 시간표 칸을 눌러 배치하세요. {'\n'}
            칸을 길게 누르면 제거됩니다.
          </Text>

          <View style={mt.manualTsWrapper}>
            <View style={mt.manualTsTimetableContainer}>
              <View style={mt.manualTsGrid} collapsable={false}>
                <ViewShot
                  ref={captureTimetableRef}
                  options={{ format: 'png', quality: 1 }}
                  style={mt.manualTsTimetableViewShot}
                  collapsable={false}
                >
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
                          const subjectLocHighlight =
                            paintSubjectId != null &&
                            Boolean(content) &&
                            normalizeSubject(content) === paintSubjectId;
                          const cellStyle = [
                            mt.manualTsClassCell,
                            content ? mt.manualTsClassCellFilled : null,
                            paintReady ? mt.manualTsClassCellPaintReady : null,
                            content
                              ? { backgroundColor: getCellColor(content) }
                              : null,
                            subjectLocHighlight
                              ? mt.manualTsClassCellSubjectHighlight
                              : null,
                          ];
                          return (
                            <TouchableOpacity
                              key={`${day}-${period}`}
                              activeOpacity={0.65}
                              style={cellStyle}
                              onPress={() => handleCellPress(day, period)}
                              onLongPress={() =>
                                handleCellLongPress(day, period)
                              }
                              delayLongPress={380}
                            >
                              <Text
                                style={[
                                  mt.manualTsClassCellText,
                                  content
                                    ? mt.manualTsClassCellTextFilled
                                    : null,
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
                    <View style={mt.manualTsMergedFooterRow}>
                      <Pressable
                        style={mt.manualTsMergedFooterFullCell}
                        onPress={handleAddPeriodRow}
                        disabled={visiblePeriodCount >= MANUAL_TS_MAX_PERIODS}
                      >
                        <View style={mt.manualTsMergedFooterActionRow}>
                          <TouchableOpacity
                            style={mt.manualTsRefreshButton}
                            onPress={handleAddPeriodRow}
                            activeOpacity={0.7}
                            disabled={
                              visiblePeriodCount >= MANUAL_TS_MAX_PERIODS
                            }
                          >
                            <Feather
                              name="plus"
                              size={normalize(16)}
                              color={COLORS.background2}
                              style={{
                                opacity:
                                  visiblePeriodCount >= MANUAL_TS_MAX_PERIODS
                                    ? 0.35
                                    : 1,
                              }}
                            />
                          </TouchableOpacity>
                        </View>
                      </Pressable>
                    </View>
                  </ScrollView>
                </ViewShot>
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
                const onTimetable = Object.values(safeTimetable).some(
                  (cell) => normalizeSubject(cell) === subject.id,
                );
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
                      setPaintSubjectId((prev) =>
                        prev === subject.id ? null : subject.id,
                      )
                    }
                  >
                    <View
                      style={[
                        mt.manualTsSubjectDot,
                        { backgroundColor: dotColor },
                      ]}
                    />
                    <View style={mt.manualTsSubjectBody}>
                      <Text style={mt.manualTsSubjectTitle}>
                        {subject.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <AppPopupModal
        visible={showSaveImageModal}
        onClose={() => setShowSaveImageModal(false)}
        dismissOnBackdrop={false}
      >
        <Text
          style={{
            fontSize: 18,
            color: COLORS.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          저장 완료
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 16,
          }}
        >
          갤러리에 저장되었어요
        </Text>
        <TouchableOpacity
          style={{
            height: 42,
            borderRadius: 10,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setShowSaveImageModal(false)}
          activeOpacity={0.85}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: COLORS.textWhite,
            }}
          >
            확인
          </Text>
        </TouchableOpacity>
      </AppPopupModal>
    </SafeAreaView>
  );
}
