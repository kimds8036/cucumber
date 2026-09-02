import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HourMinuteWheel from '../../components/common/HourMinuteWheel';
import PeriodTimesSkeleton from '../../components/common/PeriodTimesSkeleton';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createNotificationSettingsStyles } from '../../styles/mypage.style';
import { api } from '../../utils/api';
import {
  saveTimetableLocalAndSync,
  TIMETABLE_SOURCE_AUTO,
  TIMETABLE_SOURCE_MANUAL,
} from '../../utils/timetableSync';
import {
  defaultPeriodTimes,
  loadPeriodTimeSettings,
  savePeriodTimeSettings,
  validatePeriodTimeSettings,
  tryUpdatePeriodTime,
  minutesToHhmm,
  hhmmToMinutes,
} from '../../utils/widget/periodTimeSettings.js';
import { getMaxPeriodFromTimetableKeys } from '../../src/screens/timetable/periodUtils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parseHhmm(hhmm) {
  const mins = hhmmToMinutes(hhmm) ?? 9 * 60;
  return { hour: Math.floor(mins / 60), minute: mins % 60 };
}

/** 기존 설정이 있어도 시간표 최대 교시 수에 맞춰 늘리거나 자름 */
function alignPeriodsToCount(existingPeriods, count) {
  const n = Math.max(1, Number(count) || 7);
  const sorted = Array.isArray(existingPeriods)
    ? [...existingPeriods]
        .filter((p) => p && Number(p.periodNumber) > 0)
        .sort((a, b) => a.periodNumber - b.periodNumber)
    : [];

  if (sorted.length === 0) {
    return defaultPeriodTimes(n);
  }

  const out = sorted.slice(0, n).map((p, i) => ({
    periodNumber: i + 1,
    startTime: p.startTime,
    endTime: p.endTime,
  }));

  while (out.length < n) {
    const lastEnd = hhmmToMinutes(out[out.length - 1]?.endTime) ?? 9 * 60;
    const start = lastEnd + 10;
    const end = start + 50;
    out.push({
      periodNumber: out.length + 1,
      startTime: minutesToHhmm(start),
      endTime: minutesToHhmm(Math.min(end, 23 * 60 + 55)),
    });
  }
  return out;
}

function TimeField({ label, value, onPress, styles }) {
  return (
    <TouchableOpacity style={styles.timeField} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.timeFieldLabel}>{label}</Text>
      <Text style={styles.timeFieldValue}>{value}</Text>
    </TouchableOpacity>
  );
}

/**
 * 시간표 최초 등록 직후 교시 시각을 설정하는 온보딩 화면.
 * PeriodTimeSettings(마이페이지 설정)와 별도 페이지.
 *
 * route.params:
 * - pendingTimetable?: object  — 있으면 완료 시 캐시에 함께 저장
 * - sourceTimetable?: object   — 교시 수 계산용 (이미 저장된 자동선택 등)
 * - timetableCacheKey?: string
 * - suggestedPeriodCount?: number
 */
const PeriodTimeSetup = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const ns = useMemo(
    () => createNotificationSettingsStyles(normalize),
    [normalize],
  );

  const pendingTimetable = route?.params?.pendingTimetable;
  const sourceTimetable =
    route?.params?.sourceTimetable || pendingTimetable || null;
  const timetableCacheKey = route?.params?.timetableCacheKey;
  const timetableSource =
    route?.params?.timetableSource === TIMETABLE_SOURCE_AUTO
      ? TIMETABLE_SOURCE_AUTO
      : TIMETABLE_SOURCE_MANUAL;

  const suggestedPeriodCount = useMemo(() => {
    if (sourceTimetable && typeof sourceTimetable === 'object') {
      return getMaxPeriodFromTimetableKeys(sourceTimetable, 7);
    }
    const fromParam = Number(route?.params?.suggestedPeriodCount);
    if (Number.isFinite(fromParam) && fromParam > 0) return fromParam;
    return 7;
  }, [route?.params?.suggestedPeriodCount, sourceTimetable]);

  const SectionHeader = ({ icon, title, description, Icon = Ionicons }) => (
    <View style={ns.sectionHeader}>
      <View style={ns.sectionHeaderTopRow}>
        <Icon name={icon} size={normalize(20)} color={colors.primary} />
        <Text style={ns.sectionHeaderText}>{title}</Text>
      </View>
      {description ? (
        <Text style={ns.sectionHeaderDescription}>{description}</Text>
      ) : null}
    </View>
  );

  const [userScope, setUserScope] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerError, setPickerError] = useState('');
  const [draftHour, setDraftHour] = useState(9);
  const [draftMinute, setDraftMinute] = useState(0);

  useEffect(() => {
    if (!pickerTarget) {
      setPickerError('');
      return;
    }
    const hhmm = minutesToHhmm(draftHour * 60 + draftMinute);
    const result = tryUpdatePeriodTime(
      periods,
      pickerTarget.index,
      pickerTarget.field,
      hhmm,
    );
    setPickerError(result.ok ? '' : result.message);
  }, [pickerTarget, draftHour, draftMinute, periods]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPeriods(true);
    (async () => {
      let scope = null;
      try {
        const meRes = await api.get('/api/auth/me');
        const me = meRes.data?.data;
        scope =
          me?.id != null
            ? String(me.id)
            : me?.username || me?.email || null;
      } catch {
        try {
          const id = await AsyncStorage.getItem('@auth_user_id');
          if (id) scope = String(id);
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      setUserScope(scope);

      let periodCount = suggestedPeriodCount;
      // 캐시에만 시간표가 있는 경우(자동 선택)에도 최대 교시 재계산
      if (
        (!sourceTimetable || typeof sourceTimetable !== 'object') &&
        timetableCacheKey
      ) {
        try {
          const raw = await AsyncStorage.getItem(timetableCacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const tt = parsed?.timetable;
            if (tt && typeof tt === 'object') {
              periodCount = getMaxPeriodFromTimetableKeys(tt, periodCount);
            }
          }
        } catch {
          // ignore
        }
      }

      const loaded = await loadPeriodTimeSettings(scope);
      if (cancelled) return;
      setPeriods(alignPeriodsToCount(loaded?.periods, periodCount));
      if (!cancelled) setLoadingPeriods(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [suggestedPeriodCount, sourceTimetable, timetableCacheKey]);

  const openPicker = useCallback(
    (index, field) => {
      const p = periods[index];
      const { hour, minute } = parseHhmm(
        field === 'start' ? p.startTime : p.endTime,
      );
      setDraftHour(hour);
      setDraftMinute(Math.round(minute / 5) * 5);
      setPickerError('');
      setPickerTarget({ index, field });
    },
    [periods],
  );

  const applyPicker = useCallback(() => {
    if (!pickerTarget) return;
    const hhmm = minutesToHhmm(draftHour * 60 + draftMinute);
    const result = tryUpdatePeriodTime(
      periods,
      pickerTarget.index,
      pickerTarget.field,
      hhmm,
    );
    if (!result.ok) {
      setPickerError(result.message);
      return;
    }
    setPeriods(result.periods);
    setPickerTarget(null);
    setPickerError('');
    setError('');
  }, [pickerTarget, draftHour, draftMinute, periods]);

  const addPeriod = useCallback(() => {
    setPeriods((prev) => {
      const nextNum = (prev[prev.length - 1]?.periodNumber || 0) + 1;
      const lastEnd = hhmmToMinutes(prev[prev.length - 1]?.endTime) ?? 9 * 60;
      const start = lastEnd + 10;
      const end = start + 50;
      return [
        ...prev,
        {
          periodNumber: nextNum,
          startTime: minutesToHhmm(start),
          endTime: minutesToHhmm(Math.min(end, 23 * 60 + 55)),
        },
      ];
    });
    setError('');
  }, []);

  const removePeriod = useCallback((index) => {
    setPeriods((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, periodNumber: i + 1 }));
    });
    setError('');
  }, []);

  const finishToMypage = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main', params: { initialTab: 'mypage' } }],
      }),
    );
  }, [navigation]);

  const handleSave = useCallback(async () => {
    if (loadingPeriods) return;
    const validation = validatePeriodTimeSettings(periods);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await savePeriodTimeSettings(periods, userScope);
      if (!result.ok) {
        setError(result.message || '저장에 실패했어요.');
        return;
      }

      if (
        pendingTimetable &&
        typeof pendingTimetable === 'object' &&
        timetableCacheKey
      ) {
        await saveTimetableLocalAndSync(timetableCacheKey, pendingTimetable, {
          source: timetableSource,
        });
      }

      finishToMypage();
    } catch (e) {
      setError(e?.message || '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }, [
    periods,
    userScope,
    pendingTimetable,
    timetableCacheKey,
    timetableSource,
    finishToMypage,
    loadingPeriods,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader
        title="교시 시간 설정"
        onBack={() => navigation.goBack()}
        rightButtonText={saving ? '저장 중' : '완료'}
        onRightPress={handleSave}
        rightDisabled={saving || loadingPeriods}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader
          icon="time-outline"
          title="교시 시작·종료 시각"
          description="위젯에 표시할 각 교시 시간을 설정해 주세요"
        />
        <View style={[ns.card, styles.periodCard]}>
          {loadingPeriods ? (
            <PeriodTimesSkeleton normalize={normalize} rows={6} />
          ) : (
            <>
          {periods.map((p, index) => (
            <View key={`period-${p.periodNumber}-${index}`}>
              <View style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.periodTitle}>{p.periodNumber}교시</Text>
                  {periods.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removePeriod(index)}
                      hitSlop={8}
                    >
                      <Text style={styles.deleteText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.timeRow}>
                  <TimeField
                    label="시작"
                    value={p.startTime}
                    onPress={() => openPicker(index, 'start')}
                    styles={styles}
                  />
                  <Text style={styles.tilde}>~</Text>
                  <TimeField
                    label="종료"
                    value={p.endTime}
                    onPress={() => openPicker(index, 'end')}
                    styles={styles}
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={addPeriod}
            activeOpacity={0.75}
          >
            <Feather
              name="plus"
              size={normalize(16)}
              color={colors.primaryDark}
            />
            <Text style={styles.addBtnText}>교시 추가</Text>
          </TouchableOpacity>
            </>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={ns.scrollBottomSpacer} />
      </ScrollView>

      <Modal visible={!!pickerTarget} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pickerTarget
                ? `${periods[pickerTarget.index]?.periodNumber || ''}교시 ${
                    pickerTarget.field === 'start' ? '시작' : '종료'
                  }`
                : ''}
            </Text>
            <View style={styles.pickerRow}>
              <HourMinuteWheel
                key={
                  pickerTarget
                    ? `${pickerTarget.index}-${pickerTarget.field}`
                    : 'closed'
                }
                hour={draftHour}
                minute={draftMinute}
                onHourChange={setDraftHour}
                onMinuteChange={setDraftMinute}
                hours={HOURS}
                minutes={MINUTES}
                itemHeight={normalize(40)}
                pickerStyle={styles.picker}
                pickerItemStyle={styles.pickerItem}
              />
            </View>
            {pickerError ? (
              <Text style={styles.pickerError}>{pickerError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setPickerTarget(null);
                  setPickerError('');
                }}
              >
                <Text style={styles.modalBtnCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={applyPicker}
                disabled={!!pickerError}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.modalBtnOk,
                    pickerError ? styles.modalBtnOkDisabled : null,
                  ]}
                >
                  확인
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

function createStyles(normalize) {
  return {
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: {
      paddingBottom: normalize(24),
      paddingTop: normalize(4),
    },
    periodCard: {
      paddingVertical: normalize(4),
    },
    row: {
      paddingVertical: normalize(12),
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    periodTitle: {
      fontSize: normalize(13),
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deleteText: {
      fontSize: normalize(13),
      color: colors.alert,
      fontWeight: '600',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    timeField: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: normalize(10),
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeFieldLabel: {
      fontSize: normalize(11),
      color: colors.textSecondary,
      marginBottom: normalize(2),
    },
    timeFieldValue: {
      fontSize: normalize(16),
      fontWeight: '700',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    tilde: {
      fontSize: normalize(16),
      color: colors.textSecondary,
      fontWeight: '600',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      alignSelf: 'center',
      marginTop: normalize(10),
      marginBottom: normalize(8),
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(8),
      borderWidth: 1,
      borderColor: colors.primaryLight70,
      borderRadius: normalize(20),
      backgroundColor: colors.primaryLight10,
    },
    addBtnText: {
      fontSize: normalize(13),
      fontWeight: '600',
      color: colors.primaryDark,
    },
    error: {
      marginTop: normalize(10),
      marginHorizontal: normalize(20),
      fontSize: normalize(13),
      color: colors.alertDark,
      lineHeight: normalize(18),
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(18),
      borderTopRightRadius: normalize(18),
      paddingTop: normalize(16),
      paddingBottom: Platform.OS === 'ios' ? normalize(28) : normalize(16),
    },
    modalTitle: {
      textAlign: 'center',
      fontSize: normalize(16),
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    pickerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: Platform.OS === 'ios' ? normalize(220) : undefined,
      height: Platform.OS === 'ios' ? normalize(220) : undefined,
    },
    picker: {
      flex: 1,
      height: normalize(180),
    },
    pickerItem: {
      fontSize: normalize(18),
      color: colors.textPrimary,
    },
    modalActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: normalize(14),
      alignItems: 'center',
    },
    modalBtnCancel: {
      fontSize: normalize(16),
      color: colors.textSecondary,
      fontWeight: '600',
    },
    modalBtnOk: {
      fontSize: normalize(16),
      color: colors.primaryDark,
      fontWeight: '700',
    },
    modalBtnOkDisabled: {
      color: colors.textLight40,
    },
    pickerError: {
      marginHorizontal: normalize(20),
      marginBottom: normalize(10),
      fontSize: normalize(13),
      lineHeight: normalize(18),
      color: colors.alertDark,
      textAlign: 'center',
    },
  };
}

export default PeriodTimeSetup;
