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
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SubHeader from '../frame/subHeader';
import AppPopupModal from '../../components/common/AppPopupModal';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createNotificationSettingsStyles } from '../../styles/mypage.style';
import { api } from '../../utils/api';
import {
  defaultPeriodTimes,
  loadPeriodTimeSettings,
  savePeriodTimeSettings,
  validatePeriodTimeSettings,
  tryUpdatePeriodTime,
  minutesToHhmm,
  hhmmToMinutes,
} from '../../utils/widget/periodTimeSettings.js';
import { clearTimetableLocalAndSync } from '../../utils/timetableSync';

const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';
const TIMETABLE_CACHE_KEY_PREFIX = '@mypage_timetable_cache_v1:';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parseHhmm(hhmm) {
  const mins = hhmmToMinutes(hhmm) ?? 9 * 60;
  return { hour: Math.floor(mins / 60), minute: mins % 60 };
}

function TimeField({ label, value, onPress, normalize, styles }) {
  return (
    <TouchableOpacity style={styles.timeField} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.timeFieldLabel}>{label}</Text>
      <Text style={styles.timeFieldValue}>{value}</Text>
    </TouchableOpacity>
  );
}

const PeriodTimeSettings = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const ns = useMemo(
    () => createNotificationSettingsStyles(normalize),
    [normalize],
  );

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
  const [pickerTarget, setPickerTarget] = useState(null); // { index, field: 'start'|'end' }
  const [pickerError, setPickerError] = useState('');
  const [draftHour, setDraftHour] = useState(9);
  const [draftMinute, setDraftMinute] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      try {
        const loaded = await loadPeriodTimeSettings(scope);
        if (cancelled) return;
        if (loaded?.periods?.length) {
          setPeriods(loaded.periods);
        } else {
          setPeriods(defaultPeriodTimes(7));
        }
      } finally {
        if (!cancelled) setLoadingPeriods(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPicker = useCallback(
    (index, field) => {
      const p = periods[index];
      const { hour, minute } = parseHhmm(field === 'start' ? p.startTime : p.endTime);
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
      navigation.goBack();
    } catch (e) {
      setError(e?.message || '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }, [periods, userScope, navigation, loadingPeriods]);

  const timetableCacheKey = useMemo(
    () =>
      userScope
        ? `${TIMETABLE_CACHE_KEY_PREFIX}${userScope}`
        : TIMETABLE_CACHE_KEY,
    [userScope],
  );

  const performResetTimetable = useCallback(async () => {
    setResetting(true);
    try {
      await clearTimetableLocalAndSync(timetableCacheKey);
      setShowResetModal(false);
      navigation.goBack();
    } catch (e) {
      setError(e?.message || '시간표 초기화에 실패했어요.');
      setShowResetModal(false);
    } finally {
      setResetting(false);
    }
  }, [timetableCacheKey, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader
        title="시간표 설정"
        onBack={() => navigation.goBack()}
        rightButtonText={saving ? '저장 중' : '저장'}
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
          title="교시 시간 설정"
          description="각 교시의 시작·종료 시각을 설정하세요"
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
                    normalize={normalize}
                    styles={styles}
                  />
                  <Text style={styles.tilde}>~</Text>
                  <TimeField
                    label="종료"
                    value={p.endTime}
                    onPress={() => openPicker(index, 'end')}
                    normalize={normalize}
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

        <SectionHeader
          icon="refresh-outline"
          title="시간표 초기화"
          description="저장된 시간표를 모두 지우고 처음부터 다시 설정할 수 있어요"
        />
        <TouchableOpacity
          style={styles.resetCard}
          onPress={() => setShowResetModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.resetTitleRow}>
            <View style={styles.resetIconWrap}>
              <AntDesign
                name="reload"
                size={normalize(18)}
                color={colors.alertDark}
              />
            </View>
            <Text style={styles.resetTitle}>시간표 초기화</Text>
          </View>
        </TouchableOpacity>

        <View style={ns.scrollBottomSpacer} />
      </ScrollView>

      <AppPopupModal
        visible={showResetModal}
        onClose={() => !resetting && setShowResetModal(false)}
        dismissOnBackdrop={false}
      >
        <Text style={styles.resetModalTitle}>시간표 삭제</Text>
        <Text style={styles.resetModalBody}>
          시간표를 모두 지우고 초기화할까요?
        </Text>
        <View style={styles.resetModalActions}>
          <TouchableOpacity
            style={styles.resetModalCancel}
            onPress={() => setShowResetModal(false)}
            activeOpacity={0.85}
            disabled={resetting}
          >
            <Text style={styles.resetModalCancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetModalDelete}
            onPress={performResetTimetable}
            activeOpacity={0.85}
            disabled={resetting}
          >
            <Text style={styles.resetModalDeleteText}>
              {resetting ? '삭제 중' : '삭제'}
            </Text>
          </TouchableOpacity>
        </View>
      </AppPopupModal>

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
    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: normalize(2),
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
    resetCard: {
      marginHorizontal: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(16),
      borderRadius: normalize(160),
      backgroundColor: colors.alertLight,
      borderWidth: 1,
      borderColor: colors.alert,
    },
    resetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(8),
    },
    resetIconWrap: {
      width: normalize(20),
      height: normalize(32),
      borderRadius: normalize(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetTitle: {
      fontSize: normalize(15),
      fontWeight: '700',
      color: colors.alertDark,
      textAlign: 'center',
    },
    resetSubtitle: {
      fontSize: normalize(12),
      lineHeight: normalize(17),
      color: colors.alertDark,
      opacity: 0.72,
      textAlign: 'center',
    },
    error: {
      marginTop: normalize(10),
      marginHorizontal: normalize(20),
      fontSize: normalize(13),
      color: colors.alertDark,
      lineHeight: normalize(18),
    },
    resetModalTitle: {
      fontSize: normalize(18),
      color: colors.textPrimary,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: normalize(10),
    },
    resetModalBody: {
      fontSize: normalize(14),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
      marginBottom: normalize(16),
    },
    resetModalActions: {
      flexDirection: 'row',
      gap: normalize(8),
    },
    resetModalCancel: {
      flex: 1,
      height: normalize(42),
      borderRadius: normalize(10),
      backgroundColor: colors.textLight5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetModalCancelText: {
      fontSize: normalize(14),
      fontWeight: '700',
      color: colors.textSecondary,
    },
    resetModalDelete: {
      flex: 1,
      height: normalize(42),
      borderRadius: normalize(10),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetModalDeleteText: {
      fontSize: normalize(14),
      fontWeight: '700',
      color: colors.textWhite,
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

export default PeriodTimeSettings;
