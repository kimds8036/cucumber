import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createTimerStyles, getNormalize } from '../../styles/timer';
import { colors } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import MessageTabIcon from '../../assets/Group 166.svg';

const FRIEND_ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue];
const getFriendIconColorByIndex = (index) =>
  FRIEND_ICON_COLORS[index % FRIEND_ICON_COLORS.length];

const INITIAL_FRIENDS = [
  { id: 1, name: '친구1', colorIndex: 0, isActive: true },
  { id: 2, name: '친구2', colorIndex: 1, isActive: false },
  { id: 3, name: '친구3', colorIndex: 2, isActive: false },
];

// 분 단위로 변환
const getMinutesFromMidnight = (date) =>
  date.getHours() * 60 + date.getMinutes();

// 6시 ~ 익일 6시까지 Y축 구성 (24시간)
// 내부 시간 계산은 0~23시를 사용하고, 라벨만 06~24, 01~06 순으로 표시
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const TimerContent = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize]
  );

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [sessions, setSessions] = useState([]); // { startMinutes, endMinutes }

  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');

  // 스탑워치 타이머
  useEffect(() => {
    let intervalId;
    if (isRunning && startTimestamp != null) {
      intervalId = setInterval(() => {
        setElapsedMs(Date.now() - startTimestamp);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, startTimestamp]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleStart = () => {
    if (isRunning) return;
    const now = new Date();
    setIsRunning(true);
    // 이전에 누적된 시간부터 계속 이어서 진행되도록 기준 시점 조정
    setStartTimestamp(Date.now() - elapsedMs);
    // 세션 시작 시간 기록
    const startMinutes = getMinutesFromMidnight(now);
    setSessions((prev) => [...prev, { startMinutes, endMinutes: null }]);
  };

  const handlePause = () => {
    if (!isRunning) return;
    const now = new Date();
    const endMinutes = getMinutesFromMidnight(now);
    setIsRunning(false);
    if (startTimestamp != null) {
      setElapsedMs(Date.now() - startTimestamp);
    }
    setStartTimestamp(null);
    setSessions((prev) => {
      // 마지막 열린 세션 닫기
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i -= 1) {
        if (updated[i].endMinutes == null) {
          updated[i] = { ...updated[i], endMinutes };
          break;
        }
      }
      return updated;
    });
  };

  const toggleTimer = () => {
    if (isRunning) {
      handlePause();
    } else {
      handleStart();
    }
  };

  const handleAddFriend = () => {
    if (!friendQuery.trim()) return;
    setFriends((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        name: friendQuery.trim(),
        colorIndex: prev.length,
        isActive: false,
      },
    ]);
    setFriendQuery('');
    setShowFriendSearch(false);
  };

  const isSlotActive = (slotStartMinutes) => {
    const slotEndMinutes = slotStartMinutes + 10;
    return sessions.some((session) => {
      if (session.endMinutes == null) return false;
      const { startMinutes, endMinutes } = session;
      return endMinutes > slotStartMinutes && startMinutes < slotEndMinutes;
    });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 스탑워치 영역 */}
      <View style={styles.stopwatchCard}>
        <View style={styles.stopwatchLabelRow}>
          <Text style={styles.stopwatchLabel}>공부 타이머</Text>
          <Text style={styles.stopwatchSubLabel}>
            오늘의 공부 시간을 기록하세요
          </Text>
        </View>
        <Text style={styles.stopwatchTime}>{formatTime(elapsedMs)}</Text>
        <View style={styles.stopwatchControls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              !isRunning && styles.controlButton,
              isRunning && styles.controlButtonSecondary,
            ]}
            activeOpacity={0.8}
            onPress={toggleTimer}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={normalize(18)}
              color={isRunning ? colors.textPrimary : colors.background}
            />
            <Text
              style={[
                styles.controlButtonText,
                isRunning && styles.controlButtonTextSecondary,
              ]}
            >
              {isRunning ? '일시정지' : '시작'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 친구 목록 + 친구 추가 */}
      <View style={styles.friendSection}>
        <View style={styles.friendHeaderRow}>
          <Text style={styles.friendTitle}>친구</Text>
          <TouchableOpacity
            style={styles.friendAddButton}
            activeOpacity={0.8}
            onPress={() => setShowFriendSearch((prev) => !prev)}
          >
            <Ionicons name="person-add" size={normalize(16)} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.friendListRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendAvatarRow}
            style={styles.friendAvatarScroll}
          >
            {friends.map((friend) => {
              const iconColor = getFriendIconColorByIndex(friend.colorIndex);
              const isActive = friend.isActive;
              return (
                <View key={friend.id} style={{ alignItems: 'center' }}>
                  <View style={styles.friendAvatarWrapper}>
                    <View style={styles.friendAvatar}>
                      <MessageTabIcon
                        width={normalize(24)}
                        height={normalize(24)}
                        color={iconColor}
                      />
                    </View>
                    <View
                      style={[
                        styles.friendStatusDot,
                        isActive
                          ? styles.friendStatusDotActive
                          : styles.friendStatusDotInactive,
                      ]}
                    />
                  </View>
                  <Text style={styles.friendName} numberOfLines={1}>
                    {friend.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {showFriendSearch && (
          <View style={styles.friendSearchContainer}>
            <View style={styles.friendSearchInputWrapper}>
              <Ionicons
                name="search"
                size={normalize(16)}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.friendSearchInput}
                placeholder="친구 이름으로 검색"
                placeholderTextColor={colors.textSecondary}
                value={friendQuery}
                onChangeText={setFriendQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.friendSearchButton}
              activeOpacity={0.8}
              onPress={handleAddFriend}
            >
              <Text style={styles.friendSearchButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 공부 기록 타임테이블 */}
      <View style={styles.timetableSection}>
        <Text style={styles.timetableTitle}>오늘 공부 기록</Text>

        {/* 본문: 시간별 10분 단위 블럭 */}
        <View style={styles.timetableBody}>
          {HOURS.map((rowIndex) => {
            const hour = (6 + rowIndex) % 24; // 실제 시간 (0~23시)
            const rawLabel = 6 + rowIndex; // 6,7,...,29
            const displayHour = rawLabel > 24 ? rawLabel - 24 : rawLabel; // 06~24, 01~06
            return (
              <View key={rowIndex} style={styles.timetableRow}>
                <View style={styles.timetableHourCell}>
                  <Text style={styles.timetableHourText}>
                    {displayHour.toString().padStart(2, '0')}
                  </Text>
                </View>
                <View style={styles.timetableSlotsRow}>
                  {[0, 10, 20, 30, 40, 50].map((m) => {
                    const slotStartMinutes = hour * 60 + m;
                    const active = isSlotActive(slotStartMinutes);
                    return (
                      <View
                        key={m}
                        style={[
                          styles.timetableSlotCell,
                          active && styles.timetableSlotActive,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const Timer = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <MainHeader activeTab="timer" navigation={navigation} />
      <TimerContent />
      <MainFooter
        activeTab="timer"
        onTabPress={(tab) => {
          if (tab === 'board') navigation.navigate('Main');
          if (tab === 'message') navigation.navigate('Message');
          if (tab === 'school') navigation.navigate('SchoolBoardAll');
          if (tab === 'mypage') navigation.navigate('MyPage');
          if (tab === 'timer') return;
        }}
      />
    </SafeAreaView>
  );
};

export default Timer;

