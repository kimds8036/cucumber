import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SubHeader from '../../../view/frame/subHeader';
import styles from './timetable.style';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';

const CHOICE_ITEMS = [
  {
    key: 'auto',
    title: '시간표 자동 선택',
    description: '학교와 학년, 반 정보를 기반으로 시간표를 자동으로 구성합니다.',
  },
  {
    key: 'manual',
    title: '시간표 직접 선택',
    description: '수강하는 과목을 직접 선택해서 시간표를 구성합니다.',
  },
];

function TimetablePreview() {
  return (
    <View style={styles.choicePreviewWrap}>
      <View style={styles.choicePreviewHeaderRow}>
        <View style={styles.choicePreviewPeriodCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
      </View>
      {[1, 2, 3].map((row) => (
        <View key={row} style={styles.choicePreviewBodyRow}>
          <View style={styles.choicePreviewPeriodCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
        </View>
      ))}
    </View>
  );
}

export default function TimetabelChoice({ navigation, route }) {
  const [autoLoading, setAutoLoading] = useState(false);
  const scopedTimetableCacheKey = useMemo(
    () => route?.params?.timetableCacheKey || TIMETABLE_CACHE_KEY,
    [route?.params?.timetableCacheKey],
  );

  const fetchAndApplyAutoTimetable = useCallback(async () => {
    try {
      setAutoLoading(true);
      const ttRes = await api.get('/api/timetable');
      const tt = ttRes.data?.data?.timetable || {};
      const hasEntries = Object.keys(tt).length > 0;
      if (!hasEntries) {
        Alert.alert(
          '시간표 없음',
          '불러올 시간표가 없습니다. NEIS 연동 정보(학교 코드 등)를 확인하거나, 「시간표 직접 선택」으로 만들어 주세요.',
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
      navigation.navigate('Main', { initialTab: 'mypage' });
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

  const handleSelect = (mode) => {
    if (mode === 'auto') {
      fetchAndApplyAutoTimetable();
      return;
    }
    navigation.navigate('AddTimetable', {
      selectionMode: mode,
      timetableCacheKey: scopedTimetableCacheKey,
    });
  };

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
        {CHOICE_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            style={[styles.choiceCard, autoLoading && styles.choiceCardDisabled]}
            disabled={autoLoading}
            onPress={() => handleSelect(item.key)}
          >
            <Text style={styles.choiceTitle}>{item.title}</Text>
            <Text style={styles.choiceDescription}>{item.description}</Text>
            <TimetablePreview />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
