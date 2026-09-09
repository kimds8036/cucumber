import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import TimerCharacterStage from '../../components/timerAni/TimerCharacterStage';

/**
 * 타이머 캐릭터 애니메이션 조종·미리보기 랩
 * (실제 타이머 isRunning 연동 전, 헤더에서 열어 동작을 확인)
 */
export default function TimerAniLab({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const [isRunning, setIsRunning] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        body: {
          paddingHorizontal: normalize(16),
          paddingBottom: normalize(32),
        },
        hint: {
          marginTop: normalize(8),
          marginBottom: normalize(16),
          fontFamily: fonts.regular,
          fontSize: normalize(13),
          color: colors.textSecondary,
          lineHeight: normalize(20),
        },
        statusCard: {
          borderRadius: normalize(12),
          padding: normalize(14),
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.textLight20,
          marginBottom: normalize(16),
        },
        statusRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        statusLabel: {
          fontFamily: fonts.regular,
          fontSize: normalize(13),
          color: colors.textSecondary,
        },
        statusValue: {
          fontFamily: fonts.bold,
          fontSize: normalize(15),
          color: isRunning ? colors.primaryDark : colors.textPrimary,
        },
        controls: {
          marginTop: normalize(20),
          gap: normalize(10),
        },
        primaryBtn: {
          backgroundColor: isRunning ? colors.alertDark : colors.primaryDark,
          borderRadius: normalize(12),
          paddingVertical: normalize(14),
          alignItems: 'center',
        },
        primaryBtnText: {
          fontFamily: fonts.bold,
          fontSize: normalize(16),
          color: colors.textWhite,
        },
        secondaryBtn: {
          borderRadius: normalize(12),
          paddingVertical: normalize(12),
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.textLight20,
        },
        secondaryBtnText: {
          fontFamily: fonts.regular,
          fontSize: normalize(14),
          color: colors.textPrimary,
        },
        note: {
          marginTop: normalize(20),
          fontFamily: fonts.regular,
          fontSize: normalize(12),
          color: colors.textLight70,
          lineHeight: normalize(18),
        },
      }),
    [isRunning, width],
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <SubHeader
        title="타이머 애니메이션"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.hint}>
          타이머 ON이면 학생이 교실로 걸어와 책상에 앉고, OFF면 일어나서 나갑니다.
          아래에서 타이머 상태를 켜고 끄며 동작을 확인하세요.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>시뮬 isRunning</Text>
            <Text style={styles.statusValue}>
              {isRunning ? 'true (공부 중)' : 'false (멈춤)'}
            </Text>
          </View>
        </View>

        <TimerCharacterStage isRunning={isRunning} />

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => setIsRunning((v) => !v)}
          >
            <Text style={styles.primaryBtnText}>
              {isRunning ? '타이머 끄기 → 퇴장' : '타이머 켜기 → 입장·착석'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => setIsRunning(false)}
          >
            <Text style={styles.secondaryBtnText}>강제 멈춤 (자리 비움으로)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          · 걷기: 좌·우·정면·후면 4방향 × 4프레임{'\n'}
          · 착석: 앉기 전용 스프라이트가 없어 전면 포즈 + 책상으로 하반신을 가려
          표현합니다. 앉기/일어서기 일러스트를 추가하면 더 자연스러워집니다.
        </Text>
      </ScrollView>
    SafeAreaView>
  );
}
