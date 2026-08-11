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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { api } from '../../utils/api';
import {
  defaultPeriodTimes,
  loadPeriodTimeSettings,
  savePeriodTimeSettings,
  validatePeriodTimeSettings,
  minutesToHhmm,
  hhmmToMinutes,
} from '../../utils/widget/periodTimeSettings.js';

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

  const [userScope, setUserScope] = useState(null);
  const [periods, setPeriods] = useState(() => defaultPeriodTimes(7));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // { index, field: 'start'|'end' }
  const [draftHour, setDraftHour] = useState(9);
  const [draftMinute, setDraftMinute] = useState(0);

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
      const loaded = await loadPeriodTimeSettings(scope);
      if (cancelled) return;
      if (loaded?.periods?.length) {
        setPeriods(loaded.periods);
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
      setPickerTarget({ index, field });
    },
    [periods],
  );

  const applyPicker = useCallback(() => {
    if (!pickerTarget) return;
    const hhmm = minutesToHhmm(draftHour * 60 + draftMinute);
    setPeriods((prev) =>
      prev.map((p, i) =>
        i === pickerTarget.index
          ? {
              ...p,
              [pickerTarget.field === 'start' ? 'startTime' : 'endTime']: hhmm,
            }
          : p,
      ),
    );
    setPickerTarget(null);
    setError('');
  }, [pickerTarget, draftHour, draftMinute]);

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
  }, [periods, userScope, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader
        title="교시 시간 설정"
        onBack={() => navigation.goBack()}
        rightButtonText={saving ? '저장 중' : '저장'}
        onRightPress={handleSave}
        rightDisabled={saving}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          위젯에 표시할 각 교시의 시작·종료 시각을 설정해요. 저장하면 홈 화면
          시간표 위젯이 바로 갱신됩니다.
        </Text>

        <TouchableOpacity style={styles.addBtn} onPress={addPeriod} activeOpacity={0.75}>
          <Ionicons name="add-circle-outline" size={normalize(20)} color={colors.primaryDark} />
          <Text style={styles.addBtnText}>교시 추가</Text>
        </TouchableOpacity>

        {periods.map((p, index) => (
          <View key={`period-${p.periodNumber}-${index}`} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.periodTitle}>{p.periodNumber}교시</Text>
              {periods.length > 1 && (
                <TouchableOpacity onPress={() => removePeriod(index)} hitSlop={8}>
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
        ))}

        {!!error && <Text style={styles.error}>{error}</Text>}
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
              <Picker
                selectedValue={draftHour}
                onValueChange={setDraftHour}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {HOURS.map((h) => (
                  <Picker.Item
                    key={`h-${h}`}
                    label={`${String(h).padStart(2, '0')}시`}
                    value={h}
                  />
                ))}
              </Picker>
              <Picker
                selectedValue={draftMinute}
                onValueChange={setDraftMinute}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {MINUTES.map((m) => (
                  <Picker.Item
                    key={`m-${m}`}
                    label={`${String(m).padStart(2, '0')}분`}
                    value={m}
                  />
                ))}
              </Picker>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setPickerTarget(null)}
              >
                <Text style={styles.modalBtnCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={applyPicker}>
                <Text style={styles.modalBtnOk}>확인</Text>
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
      paddingHorizontal: normalize(20),
      paddingBottom: normalize(40),
      paddingTop: normalize(8),
    },
    hint: {
      fontSize: normalize(13),
      lineHeight: normalize(20),
      color: colors.textSecondary,
      marginBottom: normalize(16),
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      alignSelf: 'flex-start',
      marginBottom: normalize(12),
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(4),
    },
    addBtnText: {
      fontSize: normalize(14),
      fontWeight: '600',
      color: colors.primaryDark,
    },
    row: {
      backgroundColor: colors.surface,
      borderRadius: normalize(14),
      padding: normalize(14),
      marginBottom: normalize(10),
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(10),
    },
    periodTitle: {
      fontSize: normalize(15),
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deleteText: {
      fontSize: normalize(13),
      color: colors.alertDark,
      fontWeight: '600',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    timeField: {
      flex: 1,
      backgroundColor: colors.background,
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
      fontSize: normalize(18),
      fontWeight: '700',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    tilde: {
      fontSize: normalize(16),
      color: colors.textSecondary,
      fontWeight: '600',
    },
    error: {
      marginTop: normalize(8),
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
  };
}

export default PeriodTimeSettings;
