/**
 * 타이머 시간 카드 — 왼쪽 시간 영역(7) · 세로 구분선 · 오른쪽 메뉴 영역(3)
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/colors';
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
  weeklyRate = 0,
  streakDays = 0,
  onOpenSettings,
}) {
  const { settings, ready } = useTimerSettings();
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
  const pomoDots = Math.max(1, pomo.longBreakEvery || settings.longBreakEvery || 4);
  const pomoFilled = Math.min(pomoDots, pomo.focusCountInCycle || 0);

  return (
    <GuideFocusTarget
      name={T.TIMER_TIMER_CARD}
      style={[styles.timerCard, tdb('#34C759')]}
    >
      <View style={styles.timerMainCol}>
        <View style={[styles.dateBar, tdb('#30B0C7')]}>
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
          <View
            style={[
              styles.dateBarRight,
              !SHOW_DATE_NAV && { marginLeft: 'auto' },
            ]}
          >
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
              <View style={styles.pomoPhaseChip}>
                <Text style={styles.pomoPhaseChipText}>{pomoLabel}</Text>
              </View>
              <View style={styles.pomoCycleDots}>
                {Array.from({ length: pomoDots }, (_, i) => (
                  <View
                    key={`pomo-dot-${i}`}
                    style={[
                      styles.pomoCycleDot,
                      i < pomoFilled && styles.pomoCycleDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.timerTime} numberOfLines={1} adjustsFontSizeToFit>
              {formatPomodoro(pomo.remainingSec)}
            </Text>
            <View style={styles.pomoProgressTrack}>
              <View
                style={[
                  styles.pomoProgressFill,
                  { width: `${Math.round((pomo.progress || 0) * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.pomoBtnRow}>
              <TouchableOpacity
                style={[styles.timerBtn, pomoRunning && styles.timerBtnPause]}
                activeOpacity={0.8}
                onPress={() => {
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
                onPress={() => pomo.skip()}
              >
                <Ionicons name="play-skip-forward" size={normalize(16)} color={colors.textLight4} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pomoSubBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="초기화"
                onPress={() => pomo.reset(timerSettingsToPomodoroConfig(settings))}
              >
                <Ionicons name="refresh" size={normalize(16)} color={colors.textLight4} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pomoTodayText}>
              {`오늘 공부 ${formatHMS(displayTotalMs)}`}
            </Text>
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
