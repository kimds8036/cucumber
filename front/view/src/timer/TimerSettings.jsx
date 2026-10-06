/**
 * 타이머 설정 — 뽀모도로 · 스터디룸 캐릭터 성별
 * 값은 기기 캐시에 남겨 앱을 다시 열어도 유지한다.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import SubHeader from '../../frame/subHeader';
import { colors } from '../../../styles/colors';
import { createTimerSettingsStyles, getNormalize } from '../../../styles/timer';
import { WALK_BY_GENDER } from '../../../assets/timer_ani/frames';
import { shiftTimerSetting, useTimerSettings } from './timerSettingsStorage';

const PHASE_END_CUES = [
  { key: 'sound', label: '소리' },
  { key: 'vibrate', label: '진동' },
  { key: 'popup', label: '팝업' },
  { key: 'none', label: '없음' },
];

const PHASE_END_DESC = {
  sound: '집중·휴식이 끝나면 알림 소리로 알려줘요',
  vibrate: '집중·휴식이 끝나면 진동으로 알려줘요',
  popup: '집중·휴식이 끝나면 화면 팝업으로 알려줘요',
  none: '집중·휴식이 끝나도 따로 알리지 않아요',
};

const POMODORO_ROWS = [
  { key: 'focusMin', label: '집중 시간', unit: '분' },
  { key: 'shortBreakMin', label: '짧은 휴식', unit: '분' },
  { key: 'longBreakMin', label: '긴 휴식', unit: '분' },
  {
    key: 'longBreakEvery',
    label: '긴 휴식 주기',
    desc: '집중을 이 횟수만큼 마치면 긴 휴식',
    unit: '회',
  },
];

const GENDER_OPTIONS = [
  { key: 'girl', label: '여자', image: WALK_BY_GENDER.girl.down[0] },
  { key: 'boy', label: '남자', image: WALK_BY_GENDER.boy.down[0] },
  { key: 'random', label: '랜덤', image: null },
];

export default function TimerSettings({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerSettingsStyles(width, normalize),
    [width, normalize],
  );
  const { settings, ready, update } = useTimerSettings();
  const { pomodoroOn, autoStart, phaseEndCue, gender } = settings;

  const switchColors = {
    trackColor: { false: colors.textLight1, true: colors.primary },
    thumbColor: colors.white,
    ios_backgroundColor: colors.textLight1,
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SubHeader title="타이머 설정" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>뽀모도로</Text>
        <View style={styles.card}>
          {POMODORO_ROWS.map((row, index) => (
            <View key={row.key} style={[styles.row, index > 0 && styles.rowBorder]}>
              <View style={styles.rowTextCol}>
                <Text style={[styles.rowLabel, !pomodoroOn && styles.rowLabelDisabled]}>
                  {row.label}
                </Text>
                {row.desc ? <Text style={styles.rowDesc}>{row.desc}</Text> : null}
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  disabled={!pomodoroOn || !ready}
                  accessibilityLabel={`${row.label} 줄이기`}
                  onPress={() => update({ [row.key]: shiftTimerSetting(row.key, -1) })}
                >
                  <Ionicons
                    name="remove"
                    size={normalize(16)}
                    color={pomodoroOn ? colors.text : colors.textLight2}
                  />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, !pomodoroOn && styles.stepperValueDisabled]}>
                  {`${settings[row.key]}${row.unit}`}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  disabled={!pomodoroOn || !ready}
                  accessibilityLabel={`${row.label} 늘리기`}
                  onPress={() => update({ [row.key]: shiftTimerSetting(row.key, 1) })}
                >
                  <Ionicons
                    name="add"
                    size={normalize(16)}
                    color={pomodoroOn ? colors.text : colors.textLight2}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowLabel, !pomodoroOn && styles.rowLabelDisabled]}>
                자동 시작
              </Text>
              <Text style={styles.rowDesc}>집중·휴식이 끝나면 다음 단계를 바로 시작해요</Text>
            </View>
            <Switch
              value={autoStart}
              onValueChange={(value) => update({ autoStart: value })}
              disabled={!pomodoroOn || !ready}
              {...switchColors}
            />
          </View>
          <View style={[styles.cueBlock, styles.rowBorder]}>
            <Text style={[styles.rowLabel, !pomodoroOn && styles.rowLabelDisabled]}>
              끝날 때 알림
            </Text>
            <Text style={styles.rowDesc}>
              {PHASE_END_DESC[phaseEndCue] || PHASE_END_DESC.popup}
            </Text>
            <View style={styles.cueRow}>
              {PHASE_END_CUES.map((cue) => {
                const active = (phaseEndCue || 'popup') === cue.key;
                return (
                  <TouchableOpacity
                    key={cue.key}
                    style={[styles.cueChip, active && styles.cueChipActive]}
                    onPress={() => update({ phaseEndCue: cue.key })}
                    disabled={!pomodoroOn || !ready}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.cueChipText,
                        active && styles.cueChipTextActive,
                        !pomodoroOn && styles.rowLabelDisabled,
                      ]}
                    >
                      {cue.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>스터디룸 캐릭터</Text>
        <Text style={styles.footNote}>
          선택한 캐릭터는 이 기기에 저장되고, 내 스터디룸에 보여요
        </Text>
        <View style={styles.characterCard}>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.genderOption, active && styles.genderOptionActive]}
                  onPress={() => update({ gender: opt.key })}
                  activeOpacity={0.8}
                  disabled={!ready}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  {opt.image ? (
                    <Image source={opt.image} style={styles.genderImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.genderRandomBox}>
                      <Ionicons name="shuffle" size={normalize(28)} color={colors.textLight4} />
                    </View>
                  )}
                  <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}
