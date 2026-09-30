/**
 * 타이머 설정 — 뽀모도로 · 스터디룸 캐릭터 성별
 * 화면만 구성한 상태 (저장·뽀모도로 엔진·서버 연결 없음)
 */
import React, { useMemo, useState } from 'react';
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

const POMODORO_ROWS = [
  { key: 'focus', label: '집중 시간', value: '25분' },
  { key: 'shortBreak', label: '짧은 휴식', value: '5분' },
  { key: 'longBreak', label: '긴 휴식', value: '15분' },
  { key: 'longBreakEvery', label: '긴 휴식 주기', desc: '집중을 이 횟수만큼 마치면 긴 휴식', value: '4회' },
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
  const [pomodoroOn, setPomodoroOn] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [gender, setGender] = useState('random');

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
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>뽀모도로 사용</Text>
              <Text style={styles.rowDesc}>켜면 시간 카드에 뽀모도로 타이머가 표시돼요</Text>
            </View>
            <Switch value={pomodoroOn} onValueChange={setPomodoroOn} {...switchColors} />
          </View>
          {POMODORO_ROWS.map((row) => (
            <View key={row.key} style={[styles.row, styles.rowBorder]}>
              <View style={styles.rowTextCol}>
                <Text style={[styles.rowLabel, !pomodoroOn && styles.rowLabelDisabled]}>
                  {row.label}
                </Text>
                {row.desc ? <Text style={styles.rowDesc}>{row.desc}</Text> : null}
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  disabled={!pomodoroOn}
                  accessibilityLabel={`${row.label} 줄이기`}
                >
                  <Ionicons
                    name="remove"
                    size={normalize(16)}
                    color={pomodoroOn ? colors.text : colors.textLight2}
                  />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, !pomodoroOn && styles.stepperValueDisabled]}>
                  {row.value}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  disabled={!pomodoroOn}
                  accessibilityLabel={`${row.label} 늘리기`}
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
              onValueChange={setAutoStart}
              disabled={!pomodoroOn}
              {...switchColors}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>스터디룸 캐릭터</Text>
        <View style={styles.card}>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.genderOption, active && styles.genderOptionActive]}
                  onPress={() => setGender(opt.key)}
                  activeOpacity={0.8}
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
        <Text style={styles.footNote}>
          선택한 캐릭터는 다른 친구들의 스터디룸 화면에도 똑같이 보여요
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
