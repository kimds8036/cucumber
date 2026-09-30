/**
 * 타이머 시간 카드 — 왼쪽 시간 영역(7) · 세로 구분선 · 오른쪽 메뉴 영역(3)
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/colors';
import { GuideFocusTarget } from '../../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../../src/screens/UserGuide/guideFocusTargets';
import { tdb, formatHMS } from './timerHelpers';

/** 날짜 이동(이전·달력·다음) 버튼. 숨김 상태이며 코드는 남겨 둔다 */
const SHOW_DATE_NAV = false;

/** 백엔드 연결 전 표시용 더미 값 */
const DUMMY_STREAK_DAYS = 50;

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
}) {
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
              {DUMMY_STREAK_DAYS}일
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
