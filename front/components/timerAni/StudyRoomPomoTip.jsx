import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { colors, fonts } from '../../styles/colors';
import { usePomodoro } from '../../hooks/usePomodoro';
import {
  requestPomodoroSkip,
  requestPomodoroToggle,
} from '../../view/src/timer/pomodoroRoomBridge';
import {
  getPomodoroView,
  pomodoroPause,
  pomodoroResume,
  pomodoroSkip,
  pomodoroStart,
} from '../../utils/pomodoroRuntimeStore';

const TIP_W = 156;
const PHASE_LABEL = {
  focus: '집중',
  short_break: '짧은 휴식',
  long_break: '긴 휴식',
};

function formatRemain(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function toggleClock() {
  if (requestPomodoroToggle()) return;
  const view = getPomodoroView();
  if (view.status === 'running') pomodoroPause();
  else if (view.status === 'paused') pomodoroResume();
  else pomodoroStart();
}

function skipClock() {
  if (requestPomodoroSkip()) return;
  pomodoroSkip();
}

/**
 * 내 캐릭터 위 뽀모도로 조작. 남은 시간, 일시정지, 건너뛰기.
 */
export default function StudyRoomPomoTip({ visible, seat, stageW }) {
  const pomo = usePomodoro();
  if (!visible || !seat) return null;

  const isBreak = pomo.phase === 'short_break' || pomo.phase === 'long_break';
  const running = pomo.status === 'running';
  const left = Math.min(
    Math.max(8, seat.seatX + seat.studyW / 2 - TIP_W / 2),
    Math.max(8, (Number(stageW) || TIP_W + 16) - TIP_W - 8),
  );
  const top = Math.max(8, seat.seatY - 118);

  return (
    <View
      pointerEvents="box-none"
      style={[tipStyles.wrap, { left, top, width: TIP_W, zIndex: 240 }]}
    >
      <View style={tipStyles.card}>
        <Text style={[tipStyles.phase, isBreak && tipStyles.phaseBreak]}>
          {PHASE_LABEL[pomo.phase] || PHASE_LABEL.focus}
        </Text>
        <Text style={[tipStyles.time, isBreak && tipStyles.timeBreak]}>
          {formatRemain(pomo.remainingSec)}
        </Text>
        <View style={tipStyles.actions}>
          <TouchableOpacity
            style={[tipStyles.mainBtn, isBreak && tipStyles.mainBtnBreak, running && tipStyles.mainBtnPause]}
            onPress={toggleClock}
            activeOpacity={0.85}
            accessibilityLabel={running ? '일시정지' : '시작'}
          >
            <Ionicons
              name={running ? 'pause' : 'play'}
              size={16}
              color={running ? colors.text : colors.white}
            />
            <Text style={[tipStyles.mainText, running && tipStyles.mainTextPause]}>
              {running ? '일시정지' : pomo.status === 'paused' ? '계속' : '시작'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tipStyles.skipBtn}
            onPress={skipClock}
            activeOpacity={0.85}
            accessibilityLabel="건너뛰기"
          >
            <FontAwesome6 name="arrows-rotate" size={16} color={colors.textLight5} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={tipStyles.caret} />
    </View>
  );
}

const tipStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 6,
  },
  phase: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  phaseBreak: {
    color: '#C46A58',
  },
  time: {
    marginTop: 2,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
  },
  timeBreak: {
    color: '#C46A58',
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainBtn: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mainBtnBreak: {
    backgroundColor: '#C46A58',
  },
  mainBtnPause: {
    backgroundColor: colors.textLight05,
  },
  mainText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.white,
  },
  mainTextPause: {
    color: colors.text,
  },
  skipBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.textLight05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: {
    width: 10,
    height: 10,
    marginTop: -5,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
});
