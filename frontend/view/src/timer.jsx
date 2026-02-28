import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Modal,
  Animated,
  Easing,
  Alert,
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

const getMinutesFromMidnight = (date) =>
  date.getHours() * 60 + date.getMinutes();

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ── 쿡찌르기 팝업 컴포넌트 ───────────────────────────
const PokeModal = ({ visible, friend, onClose, onPoke, onNotifyLater }) => {
  const shakeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      // 팝업 열릴 때 살짝 흔들기 애니메이션
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 60,  useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60,  useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 6,  duration: 60,  useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60,  useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 60,  useNativeDriver: true, easing: Easing.linear }),
      ]).start();
    }
  }, [visible]);

  if (!friend) return null;

  const isStudying = friend.isActive;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 딤 배경 */}
      <TouchableOpacity style={pokeStyles.overlay} onPress={onClose} activeOpacity={1} />

      <View style={pokeStyles.popupWrapper}>
        <Animated.View
          style={[pokeStyles.popup, { transform: [{ translateX: shakeAnim }] }]}
        >
          {/* 핸들 */}
          <View style={pokeStyles.handle} />

          {/* 아바타 + 이름 */}
          <View style={pokeStyles.friendRow}>
            <View
              style={[
                pokeStyles.avatar,
                { backgroundColor: getFriendIconColorByIndex(friend.colorIndex) + '33' },
              ]}
            >
              <MessageTabIcon
                width={28}
                height={28}
                color={getFriendIconColorByIndex(friend.colorIndex)}
              />
              {/* 공부 중 표시 */}
              {isStudying && (
                <View style={pokeStyles.studyingBadge}>
                  <Ionicons name="book" size={9} color="#fff" />
                </View>
              )}
            </View>
            <View>
              <Text style={pokeStyles.friendName}>{friend.name}</Text>
              <View style={pokeStyles.statusRow}>
                <View
                  style={[
                    pokeStyles.statusDot,
                    { backgroundColor: isStudying ? '#52B788' : '#bbb' },
                  ]}
                />
                <Text style={pokeStyles.statusText}>
                  {isStudying ? '공부 중' : '공부 안 하는 중'}
                </Text>
              </View>
            </View>
          </View>

          <View style={pokeStyles.divider} />

          {/* 상태별 메시지 */}
          {isStudying ? (
            // 공부 중인 친구
            <>
              <View style={pokeStyles.infoBox}>
                <Text style={pokeStyles.infoEmoji}>🤫</Text>
                <View style={{ flex: 1 }}>
                  <Text style={pokeStyles.infoTitle}>쉿, 공부 중이에요</Text>
                  <Text style={pokeStyles.infoDesc}>
                    {friend.name}님이 지금 집중하고 있어요.{'\n'}
                    공부가 끝나면 알림을 보내드릴게요!
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={pokeStyles.primaryBtn}
                onPress={onNotifyLater}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={pokeStyles.primaryBtnText}>공부 끝나면 알려줘!</Text>
              </TouchableOpacity>

              <TouchableOpacity style={pokeStyles.cancelBtn} onPress={onClose}>
                <Text style={pokeStyles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </>
          ) : (
            // 공부 안 하는 친구
            <>
              <View style={pokeStyles.infoBox}>
                <Text style={pokeStyles.infoEmoji}>👉</Text>
                <View style={{ flex: 1 }}>
                  <Text style={pokeStyles.infoTitle}>쿡 찌르기</Text>
                  <Text style={pokeStyles.infoDesc}>
                    {friend.name}님에게 공부하자는{'\n'}
                    알림을 보낼게요!
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={pokeStyles.primaryBtn}
                onPress={onPoke}
                activeOpacity={0.8}
              >
                <Text style={pokeStyles.primaryBtnText}>👉 공부하자!</Text>
              </TouchableOpacity>

              <TouchableOpacity style={pokeStyles.cancelBtn} onPress={onClose}>
                <Text style={pokeStyles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ── 친구 추가 팝업 ─────────────────────────────────────
const AddFriendModal = ({ visible, onClose, onAdd }) => {
  const [query, setQuery] = useState('');

  const handleAdd = () => {
    if (!query.trim()) return;
    onAdd(query.trim());
    setQuery('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[pokeStyles.overlay, addFriendStyles.overlayTransparent]}
        onPress={onClose}
        activeOpacity={1}
      />

      <View style={pokeStyles.popupWrapper}>
        <View style={pokeStyles.popup}>
          <View style={pokeStyles.handle} />

          <Text style={addFriendStyles.title}>친구 추가</Text>
          <Text style={addFriendStyles.subtitle}>아이디로 친구를 검색하세요</Text>

          <View style={addFriendStyles.inputRow}>
            <Ionicons name="search-outline" size={18} color="#aaa" />
            <TextInput
              style={addFriendStyles.input}
              placeholder="@아이디 입력"
              placeholderTextColor="#ccc"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[pokeStyles.primaryBtn, !query.trim() && addFriendStyles.btnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={!query.trim()}
          >
            <Ionicons name="person-add-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={pokeStyles.primaryBtnText}>추가하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={pokeStyles.cancelBtn} onPress={onClose}>
            <Text style={pokeStyles.cancelBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── 토스트 컴포넌트 ───────────────────────────────────
const Toast = ({ message, visible }) => {
  const opacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  return (
    <Animated.View style={[pokeStyles.toast, { opacity }]}>
      <Text style={pokeStyles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// ── 메인 컴포넌트 ────────────────────────────────────
export const TimerContent = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createTimerStyles(width, normalize), [width, normalize]);

  const [isRunning, setIsRunning]       = useState(false);
  const [elapsedMs, setElapsedMs]       = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [sessions, setSessions]         = useState([]);

  const [friends, setFriends]           = useState(INITIAL_FRIENDS);
  const [showAddFriend, setShowAddFriend] = useState(false);

  // 쿡찌르기 팝업 상태
  const [pokeTarget, setPokeTarget]     = useState(null);
  const [pokeVisible, setPokeVisible]   = useState(false);

  // 토스트 상태
  const [toastMsg, setToastMsg]         = useState('');
  const [toastKey, setToastKey]         = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastKey((k) => k + 1);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // 스탑워치
  useEffect(() => {
    let intervalId;
    if (isRunning && startTimestamp != null) {
      intervalId = setInterval(() => setElapsedMs(Date.now() - startTimestamp), 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isRunning, startTimestamp]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleStart = () => {
    if (isRunning) return;
    const now = new Date();
    setIsRunning(true);
    setStartTimestamp(Date.now() - elapsedMs);
    const startMinutes = getMinutesFromMidnight(now);
    setSessions((prev) => [...prev, { startMinutes, endMinutes: null }]);
  };

  const handlePause = () => {
    if (!isRunning) return;
    const now = new Date();
    const endMinutes = getMinutesFromMidnight(now);
    setIsRunning(false);
    if (startTimestamp != null) setElapsedMs(Date.now() - startTimestamp);
    setStartTimestamp(null);
    setSessions((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].endMinutes == null) {
          updated[i] = { ...updated[i], endMinutes };
          break;
        }
      }
      return updated;
    });
  };

  const toggleTimer = () => { isRunning ? handlePause() : handleStart(); };

  const isSlotActive = (slotStartMinutes) => {
    const slotEndMinutes = slotStartMinutes + 10;
    return sessions.some(({ startMinutes, endMinutes }) => {
      if (endMinutes == null) return false;
      return endMinutes > slotStartMinutes && startMinutes < slotEndMinutes;
    });
  };

  // 친구 아바타 탭 → 팝업 열기
  const handleFriendPress = (friend) => {
    setPokeTarget(friend);
    setPokeVisible(true);
  };

  // 쿡 찌르기 (공부 안 하는 친구)
  const handlePoke = () => {
    setPokeVisible(false);
    showToast(`👉 ${pokeTarget?.name}님에게 "공부하자!" 알림을 보냈어요`);
    setPokeTarget(null);
  };

  // 나중에 알려줘 (공부 중인 친구)
  const handleNotifyLater = () => {
    setPokeVisible(false);
    showToast(`🔔 ${pokeTarget?.name}님 공부 완료 시 알림을 예약했어요`);
    setPokeTarget(null);
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 스탑워치 */}
        <View style={styles.stopwatchCard}>
          <View style={styles.stopwatchLabelRow}>
            <Text style={styles.stopwatchLabel}>공부 타이머</Text>
            <Text style={styles.stopwatchSubLabel}>오늘의 공부 시간을 기록하세요</Text>
          </View>
          <Text style={styles.stopwatchTime}>{formatTime(elapsedMs)}</Text>
          <View style={styles.stopwatchControls}>
            <TouchableOpacity
              style={[styles.controlButton, isRunning && styles.controlButtonSecondary]}
              activeOpacity={0.8}
              onPress={toggleTimer}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={normalize(18)}
                color={isRunning ? colors.textPrimary : colors.background}
              />
              <Text style={[styles.controlButtonText, isRunning && styles.controlButtonTextSecondary]}>
                {isRunning ? '일시정지' : '시작'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 친구 목록 */}
        <View style={styles.friendSection}>
          <View style={styles.friendHeaderRow}>
            <Text style={styles.friendTitle}>친구</Text>
            <TouchableOpacity
              style={styles.friendAddButton}
              activeOpacity={0.8}
              onPress={() => setShowAddFriend(true)}
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
                return (
                  // ✅ 아바타 탭하면 팝업 열기
                  <TouchableOpacity
                    key={friend.id}
                    style={{ alignItems: 'center' }}
                    onPress={() => handleFriendPress(friend)}
                    activeOpacity={0.7}
                  >
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
                          friend.isActive
                            ? styles.friendStatusDotActive
                            : styles.friendStatusDotInactive,
                        ]}
                      />
                    </View>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {friend.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* 공부 기록 타임테이블 */}
        <View style={styles.timetableSection}>
          <Text style={styles.timetableTitle}>공부 기록</Text>
          <View style={styles.timetableBody}>
            {HOURS.map((rowIndex) => {
              const hour = (6 + rowIndex) % 24;
              const rawLabel = 6 + rowIndex;
              const displayHour = rawLabel > 24 ? rawLabel - 24 : rawLabel;
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

      {/* ── 쿡찌르기 팝업 ── */}
      <PokeModal
        visible={pokeVisible}
        friend={pokeTarget}
        onClose={() => { setPokeVisible(false); setPokeTarget(null); }}
        onPoke={handlePoke}
        onNotifyLater={handleNotifyLater}
      />

      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onAdd={(name) => {
          Alert.alert(
            '친구 요청',
            '친구요청을 보내시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '보내기',
                onPress: () => {
                  setFriends((prev) => [
                    ...prev,
                    { id: prev.length + 1, name, colorIndex: prev.length, isActive: false },
                  ]);
                  setShowAddFriend(false);
                  showToast(`✅ ${name}님에게 친구 요청을 보냈어요`);
                },
              },
            ]
          );
        }}
      />

      {/* ── 토스트 ── */}
      <Toast key={toastKey} message={toastMsg} visible={toastVisible} />
    </>
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
          if (tab === 'board')   navigation.navigate('Main');
          if (tab === 'message') navigation.navigate('Message');
          if (tab === 'school')  navigation.navigate('SchoolBoardAll');
          if (tab === 'mypage')  navigation.navigate('MyPage');
        }}
      />
    </SafeAreaView>
  );
};

export default Timer;

// ── 팝업 + 토스트 전용 스타일 ─────────────────────────
const pokeStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  popupWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  popup: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studyingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#52B788',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  statusText: {
    fontSize: 12,
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FBF9',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  infoEmoji: {
    fontSize: 28,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#8FD397',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(40,40,40,0.88)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
};

const addFriendStyles = {
  overlayTransparent: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  btnDisabled: {
    opacity: 0.4,
  },
};