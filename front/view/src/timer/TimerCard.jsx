/**
 * 타이머 시간 카드 — 왼쪽 시간 영역(7) · 세로 구분선 · 오른쪽 메뉴 영역(3)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../styles/colors';
import { GuideFocusTarget } from '../../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../../src/screens/UserGuide/guideFocusTargets';
import { tdb, formatHMS } from './timerHelpers';
import { usePomodoro } from '../../../hooks/usePomodoro';
import {
  timerSettingsToPomodoroConfig,
  useTimerSettings,
} from './timerSettingsStorage';

/** 날짜 이동(이전·달력·다음) 버튼. 숨김 상태이며 코드는 남겨 둔다 */
const SHOW_DATE_NAV = false;

const POMO_PHASE_LABEL = {
  focus: '집중',
  short_break: '짧은 휴식',
  long_break: '긴 휴식',
};

const MODE_COLORS = {
  pomodoro: '#FFF1EA',
  timer: '#EDF8EA',
  pomodoroText: '#C46A58',
  timerText: '#6F9163',
};

function PomodoroModeToggle({ on, disabled, onPress, normalize }) {
  const width = normalize(76);
  const height = normalize(28);
  const pad = normalize(2);
  const gap = normalize(3);
  const knob = height - pad * 2;
  const travel = Math.max(0, width - knob - pad * 2);
  const textInset = pad + knob + gap;
  const iconSize = Math.max(12, Math.round(knob * 0.58));
  const anim = useRef(new Animated.Value(on ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: on ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start();
  }, [on, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [MODE_COLORS.pomodoro, MODE_COLORS.timer],
  });
  const knobX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel],
  });
  const pomoOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const timerOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel="타이머 모드 전환"
      accessibilityState={{ checked: on }}
    >
      <Animated.View
        style={{
          width,
          height,
          borderRadius: height / 2,
          justifyContent: 'center',
          backgroundColor: trackColor,
          overflow: 'hidden',
        }}
      >
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            position: 'absolute',
            left: textInset,
            right: pad,
            top: 0,
            height,
            lineHeight: height,
            color: MODE_COLORS.pomodoroText,
            fontSize: normalize(10),
            fontFamily: fonts.bold,
            textAlign: 'center',
            textAlignVertical: 'center',
            includeFontPadding: false,
            opacity: pomoOpacity,
          }}
        >
          뽀모도로
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            position: 'absolute',
            left: pad,
            right: textInset,
            top: 0,
            height,
            lineHeight: height,
            color: MODE_COLORS.timerText,
            fontSize: normalize(10),
            fontFamily: fonts.bold,
            textAlign: 'center',
            textAlignVertical: 'center',
            includeFontPadding: false,
            opacity: timerOpacity,
          }}
        >
          타이머
        </Animated.Text>
        <Animated.View
          style={{
            position: 'absolute',
            left: pad,
            top: pad,
            width: knob,
            height: knob,
            borderRadius: knob / 2,
            backgroundColor: colors.white,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transform: [{ translateX: knobX }],
            shadowColor: '#000',
            shadowOpacity: 0.16,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        >
          <Animated.Text
            style={{
              position: 'absolute',
              width: knob,
              height: knob,
              lineHeight: knob,
              fontSize: iconSize,
              textAlign: 'center',
              textAlignVertical: 'center',
              includeFontPadding: false,
              opacity: pomoOpacity,
            }}
          >
            🍅
          </Animated.Text>
          <Animated.View
            style={{
              position: 'absolute',
              width: knob,
              height: knob,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: timerOpacity,
            }}
          >
            <Ionicons
              name="timer-outline"
              size={iconSize}
              color={MODE_COLORS.timerText}
              style={{ includeFontPadding: false, textAlign: 'center' }}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function formatPomodoro(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function TimerCard({
  styles,
  normalize,
  displayTotalMs,
  isViewingToday,
  isRunning,
  selectedDayKey,
  goPrevDay,
  goNextDay,
  canGoNextDay,
  setShowCalendar,
  handleSaveAsImage,
  onOpenStudyRoom,
  toggleTimer,
  onPomodoroSkip,
  onPomodoroReset,
  weeklyRate = 0,
  streakDays = 0,
  onOpenSettings,
}) {
  const { settings, ready, update } = useTimerSettings();
  const pomo = usePomodoro();
  const showPomodoro = settings.pomodoroOn && isViewingToday;

  useEffect(() => {
    if (!ready) return;
    pomo.setConfig(timerSettingsToPomodoroConfig(settings));
  }, [
    ready,
    pomo.setConfig,
    settings.focusMin,
    settings.shortBreakMin,
    settings.longBreakMin,
    settings.longBreakEvery,
    settings.autoStart,
  ]);

  const pomoRunning = pomo.status === 'running';
  const pomoPaused = pomo.status === 'paused';
  const pomoLabel = POMO_PHASE_LABEL[pomo.phase] || POMO_PHASE_LABEL.focus;
  const isBreak = pomo.phase === 'short_break' || pomo.phase === 'long_break';
  const pomoDots = Math.max(
    1,
    pomo.longBreakEvery || settings.longBreakEvery || 4,
  );
  const pomoFilled = Math.min(pomoDots, pomo.focusCountInCycle || 0);

  return (
    <GuideFocusTarget
      name={T.TIMER_TIMER_CARD}
      style={[styles.timerCard, tdb('#34C759')]}
    >
      <View style={styles.timerMainCol}>
        <View style={[styles.dateBar, tdb('#30B0C7')]}>
          <PomodoroModeToggle
            on={settings.pomodoroOn === true}
            disabled={!ready}
            onPress={() => update({ pomodoroOn: !settings.pomodoroOn })}
            normalize={normalize}
          />
          {SHOW_DATE_NAV ? (
            <View style={[styles.dateBarLeft, tdb('#0A84FF')]}>
              <TouchableOpacity
                onPress={goPrevDay}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.dateBarNavBtn}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={styles.dateBarDateTouch}
              >
                <Text style={styles.dateBarText}>
                  {selectedDayKey
                    ? selectedDayKey.replace(/-/g, '.')
                    : '--.--.--'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goNextDay}
                disabled={!canGoNextDay}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.dateBarNavBtn}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={canGoNextDay ? colors.text : colors.textLight2}
                />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.dateBarRight}>
            <View style={styles.timerCardIconRow}>
              <TouchableOpacity
                style={styles.timerCardIconBtn}
                onPress={handleSaveAsImage}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="사진 저장"
              >
                <Feather
                  name="download"
                  size={normalize(16)}
                  color={colors.textLight3}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerCardIconBtn}
                onPress={onOpenSettings}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="설정"
              >
                <Ionicons
                  name="settings-outline"
                  size={normalize(16)}
                  color={colors.textLight3}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {showPomodoro ? (
          <View style={[styles.timerBlock, tdb('#5E5CE6')]}>
            <View style={styles.pomoPhaseRow}>
              <View
                style={[
                  styles.pomoPhaseChip,
                  isBreak && styles.pomoPhaseChipBreak,
                ]}
              >
                <Text
                  style={[
                    styles.pomoPhaseChipText,
                    isBreak && styles.pomoPhaseChipTextBreak,
                  ]}
                >
                  {pomoLabel}
                </Text>
              </View>
              <View style={styles.pomoCycleDots} pointerEvents="none">
                {Array.from({ length: pomoDots }, (_, i) => (
                  <View
                    key={`pomo-dot-${i}`}
                    style={[
                      styles.pomoCycleDot,
                      i < pomoFilled &&
                        (isBreak
                          ? styles.pomoCycleDotActiveBreak
                          : styles.pomoCycleDotActive),
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text
              style={[styles.timerTime, isBreak && styles.timerTimeBreak]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPomodoro(pomo.remainingSec)}
            </Text>
            <View style={styles.pomoProgressTrack}>
              <View
                style={[
                  styles.pomoProgressFill,
                  isBreak && styles.pomoProgressFillBreak,
                  { width: `${Math.round((pomo.progress || 0) * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.pomoBtnRow}>
              <TouchableOpacity
                style={[
                  styles.timerBtn,
                  isBreak && !pomoRunning && styles.timerBtnBreak,
                  pomoRunning && styles.timerBtnPause,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (showPomodoro) {
                    toggleTimer();
                    return;
                  }
                  if (pomoRunning) pomo.pause();
                  else if (pomoPaused) pomo.resume();
                  else pomo.start();
                }}
              >
                <Ionicons
                  name={pomoRunning ? 'pause' : 'play'}
                  size={normalize(20)}
                  color={pomoRunning ? colors.text : colors.white}
                />
                <Text
                  style={[
                    styles.timerBtnText,
                    pomoRunning && styles.timerBtnTextPause,
                  ]}
                >
                  {pomoRunning ? '일시정지' : pomoPaused ? '계속' : '시작'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pomoSubBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="건너뛰기"
                onPress={() =>
                  onPomodoroSkip ? onPomodoroSkip() : pomo.skip()
                }
              >
                <Ionicons
                  name="play-skip-forward"
                  size={normalize(16)}
                  color={colors.textLight4}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pomoSubBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="초기화"
                onPress={() =>
                  onPomodoroReset
                    ? onPomodoroReset()
                    : pomo.reset(timerSettingsToPomodoroConfig(settings))
                }
              >
                <Ionicons
                  name="refresh"
                  size={normalize(16)}
                  color={colors.textLight4}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.timerBlock, tdb('#5E5CE6')]}>
            <Text
              style={styles.timerTime}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatHMS(displayTotalMs)}
            </Text>
            {isViewingToday && (
              <TouchableOpacity
                style={[styles.timerBtn, isRunning && styles.timerBtnPause]}
                onPress={toggleTimer}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRunning ? 'pause' : 'play'}
                  size={normalize(20)}
                  color={isRunning ? colors.text : colors.white}
                />
                <Text
                  style={[
                    styles.timerBtnText,
                    isRunning && styles.timerBtnTextPause,
                  ]}
                >
                  {isRunning ? '일시정지' : '시작'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.timerCardDivider} />
      <View style={styles.timerMenuCol}>
        <TouchableOpacity
          style={styles.timerMenuItem}
          activeOpacity={0.7}
          accessibilityLabel="연속 공부"
        >
          <View style={styles.timerMenuIconBox}>
            <Ionicons name="flame" size={normalize(22)} color={colors.alert} />
          </View>
          <View style={styles.timerMenuTextCol}>
            <Text style={styles.timerMenuLabel} numberOfLines={1}>
              연속 공부
            </Text>
            <Text style={styles.timerMenuValue} numberOfLines={1}>
              {streakDays}일
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.timerMenuItem}
          activeOpacity={0.7}
          accessibilityLabel="위클리 달성률"
        >
          <View style={styles.timerMenuIconBox}>
            <Ionicons
              name="checkmark-circle"
              size={normalize(22)}
              color={colors.primary}
            />
          </View>
          <View style={styles.timerMenuTextCol}>
            <Text style={styles.timerMenuLabel} numberOfLines={1}>
              위클리 달성률
            </Text>
            <Text style={styles.timerMenuValue} numberOfLines={1}>
              {weeklyRate}%
            </Text>
            <View style={styles.timerMenuProgressTrack}>
              <View
                style={[
                  styles.timerMenuProgressFill,
                  { width: `${weeklyRate}%` },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.timerMenuItem}
          onPress={onOpenStudyRoom}
          disabled={!isRunning}
          activeOpacity={0.7}
          accessibilityLabel="스터디룸 입장"
          accessibilityState={{ disabled: !isRunning }}
        >
          <View style={styles.timerMenuIconBox}>
            <MaterialCommunityIcons
              name="door-open"
              size={normalize(22)}
              color={isRunning ? colors.subcolor : colors.textLight3}
            />
          </View>
          <View style={styles.timerMenuTextCol}>
            <Text style={styles.timerMenuLabel} numberOfLines={1}>
              스터디룸
            </Text>
            <Text
              style={[
                styles.timerMenuValue,
                !isRunning && styles.timerMenuValueDisabled,
              ]}
              numberOfLines={1}
            >
              입장하기
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </GuideFocusTarget>
  );
}
