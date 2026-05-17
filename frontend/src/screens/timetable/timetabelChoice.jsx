import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../../../view/frame/subHeader';
import styles, {
  DAYS,
  createTimetableChoicePreviewStyles,
} from './timetable.style';
import { getNormalize } from '../../../styles/mypage.style';
import { getMaxPeriodFromTimetableKeys } from './periodUtils';
import { colors, TIMETABLE_SUBJECT_COLORS } from '../../../styles/colors';
import { api } from '../../../utils/api';
import AppPopupModal from '../../../components/common/AppPopupModal';

const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';

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

async function fetchTimetableFromApi() {
  const ttRes = await api.get('/api/timetable');
  return ttRes.data?.data?.timetable || {};
}

function hasTimetableEntries(timetable) {
  const tt = timetable && typeof timetable === 'object' && !Array.isArray(timetable)
    ? timetable
    : {};
  return Object.values(tt).some((value) => Boolean(normalizeSubject(value)));
}

function TimetablePreview({ timetable, loading }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const pv = useMemo(
    () => createTimetableChoicePreviewStyles(normalize),
    [normalize],
  );
  const colorSeed = 0;

  const safeTimetable = timetable || {};
  const hasTimetableData = useMemo(
    () => hasTimetableEntries(safeTimetable),
    [safeTimetable],
  );
  const maxPeriod = useMemo(
    () => getMaxPeriodFromTimetableKeys(safeTimetable, 7),
    [safeTimetable],
  );
  const periods = useMemo(
    () => Array.from({ length: maxPeriod }, (_, i) => i + 1),
    [maxPeriod],
  );

  const subjectColorMap = useMemo(() => {
    const map = {};
    if (!safeTimetable) return map;

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

  return (
    <View style={pv.choicePreviewWrapper}>
      <View style={pv.choicePreviewTimetableContainer}>
        {loading ? (
          <View
            style={{
              minHeight: normalize(200),
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: normalize(24),
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !hasTimetableData ? (
          <View style={pv.choicePreviewEmptyContainer}>
            <Text style={pv.choicePreviewEmptyText}>
              시간표 데이터가 없습니다.{'\n'}직접 선택을 눌러 시간표를 구성해주세요
            </Text>
          </View>
        ) : (
          <>
            <View style={pv.choicePreviewGrid} collapsable={false}>
              <View style={pv.choicePreviewDaysRow}>
                <View style={pv.choicePreviewPeriodHeaderCell} />
                {DAYS.map((day) => (
                  <View key={day} style={pv.choicePreviewDayCell}>
                    <Text style={pv.choicePreviewDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {periods.map((period) => (
                <View key={period} style={pv.choicePreviewRow}>
                  <View style={pv.choicePreviewPeriodCell}>
                    <Text style={pv.choicePreviewPeriodText}>{period}</Text>
                  </View>
                  {DAYS.map((day) => {
                    const content = getCellContent(day, period);
                    const cellStyle = [
                      pv.choicePreviewClassCell,
                      content ? pv.choicePreviewClassCellFilled : null,
                      content ? { backgroundColor: getCellColor(content) } : null,
                    ];
                    return (
                      <View key={`${day}-${period}`} style={cellStyle}>
                        <Text
                          style={[
                            pv.choicePreviewClassCellText,
                            content ? pv.choicePreviewClassCellTextFilled : null,
                          ]}
                          lineBreakMode="wordWrapping"
                          lineBreakStrategyIOS="hangul-word"
                        >
                          {content}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default function TimetabelChoice({ navigation, route }) {
  const [autoLoading, setAutoLoading] = useState(false);
  const [showAutoAddedModal, setShowAutoAddedModal] = useState(false);
  const [previewTimetable, setPreviewTimetable] = useState({});
  const [previewLoading, setPreviewLoading] = useState(true);
  const scopedTimetableCacheKey = useMemo(
    () => route?.params?.timetableCacheKey || TIMETABLE_CACHE_KEY,
    [route?.params?.timetableCacheKey],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tt = await fetchTimetableFromApi();
        if (!cancelled) setPreviewTimetable(tt);
      } catch (e) {
        console.warn(
          '[TimetabelChoice] /api/timetable 조회 실패:',
          e?.response?.data || e?.message || e,
        );
        if (!cancelled) setPreviewTimetable({});
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAndApplyAutoTimetable = useCallback(async () => {
    try {
      setAutoLoading(true);
      const tt = await fetchTimetableFromApi();
      const hasEntries = Object.keys(tt).length > 0;
      if (!hasEntries) {
        Alert.alert(
          '시간표 없음',
          '불러올 시간표가 없습니다. "시간표 직접 선택"으로 만들어 주세요.',
        );
        return;
      }
      await AsyncStorage.setItem(
        scopedTimetableCacheKey,
        JSON.stringify({
          ts: Date.now(),
          timetable: tt,
          clearedByUser: false,
        }),
      );
      setShowAutoAddedModal(true);
    } catch (e) {
      console.warn(
        '[TimetabelChoice] /api/timetable 자동 조회 실패:',
        e?.response?.data || e?.message || e,
      );
      Alert.alert(
        '불러오기 실패',
        e?.response?.data?.message || '시간표를 가져오는 중 오류가 발생했습니다.',
      );
    } finally {
      setAutoLoading(false);
    }
  }, [navigation, scopedTimetableCacheKey]);

  const handleSelect = async (mode) => {
    if (mode === 'auto') {
      fetchAndApplyAutoTimetable();
      return;
    }

    let timetableForManual = previewTimetable;
    if (previewLoading) {
      try {
        timetableForManual = await fetchTimetableFromApi();
        setPreviewTimetable(timetableForManual);
      } catch (e) {
        console.warn(
          '[TimetabelChoice] 직접 선택 진입 전 시간표 조회 실패:',
          e?.response?.data || e?.message || e,
        );
        timetableForManual = {};
      } finally {
        setPreviewLoading(false);
      }
    }

    if (!hasTimetableEntries(timetableForManual)) {
      navigation.navigate('EditTimetable', {
        existingTimetable: {},
        timetableCacheKey: scopedTimetableCacheKey,
        returnToMypage: true,
      });
      return;
    }

    try {
      const [meRes, ttRes] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/timetable'),
      ]);
      const me = meRes.data?.data;
      const tt = ttRes.data?.data?.timetable;
      const initialTimetable =
        tt && typeof tt === 'object' && !Array.isArray(tt) ? { ...tt } : {};
      const timetableScope = {
        schoolId: me?.school?.id ?? null,
        grade: me?.grade ?? null,
      };
      navigation.navigate('AddTimetable', {
        selectionMode: mode,
        timetableCacheKey: scopedTimetableCacheKey,
        initialTimetable,
        timetableScope,
      });
    } catch (e) {
      console.warn(
        '[TimetabelChoice] 직접 선택 진입 전 시간표/프로필 조회 실패:',
        e?.response?.data || e?.message || e,
      );
      navigation.navigate('AddTimetable', {
        selectionMode: mode,
        timetableCacheKey: scopedTimetableCacheKey,
        initialTimetable: {},
      });
    }
  };

  const handleConfirmAutoAdded = useCallback(() => {
    setShowAutoAddedModal(false);
    navigation.navigate('Main', { initialTab: 'mypage' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="시간표 선택" onBack={() => navigation.goBack()} />
      {autoLoading ? (
        <View style={styles.choiceLoadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.choiceLoadingText}>학교 시간표를 불러오는 중…</Text>
        </View>
      ) : null}
      <View style={styles.choiceContent}>
        <Text style={styles.choiceTitle}>이 시간표가 맞나요?</Text>
        <Text style={styles.choiceDescription}>
          Neis(교육행정정보시스템)에서 제공하는 시간표예요. {'\n'}실제와 같으면 자동 선택, 다르면 직접 선택으로 구성해보세요.
        </Text>
        <TimetablePreview timetable={previewTimetable} loading={previewLoading} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.choiceCardRight, { flex: 1 }, autoLoading && styles.choiceCardDisabled]}
            disabled={autoLoading}
            onPress={() => handleSelect('auto')}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Entypo name="check" size={20} color={colors.background} />
              <Text style={styles.choiceRightTitle}>자동 선택</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.choiceCardWrong, { flex: 1 }, autoLoading && styles.choiceCardDisabled]}
            disabled={autoLoading}
            onPress={() => handleSelect('manual')}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.choiceWrongTitle}>직접 선택</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <AppPopupModal
        visible={showAutoAddedModal}
        onClose={() => setShowAutoAddedModal(false)}
      >
        <Text
          style={{
            fontSize: 18,
            color: colors.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          시간표가 추가되었습니다.
        </Text>
        <View style={{ marginBottom: 16, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            실제 시간표와 다를 경우
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            <Feather name="edit" size={16} color={colors.textSecondary} />
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 22,
              }}
            >
              {' '} 버튼으로 편집할 수 있습니다.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={{
            height: 42,
            borderRadius: 10,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={handleConfirmAutoAdded}
          activeOpacity={0.85}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.textWhite,
            }}
          >
            확인
          </Text>
        </TouchableOpacity>
      </AppPopupModal>
    </SafeAreaView>
  );
}
