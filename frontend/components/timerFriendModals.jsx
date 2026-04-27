/**
 * timerFriendModals.jsx
 * 친구 목록 UI + PokeModal + AddFriendModal + Toast
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ProfileIcon from '../assets/Profile.svg';
import { colors } from '../styles/colors';
import { createTimerFriendModalStyles, getNormalize } from '../styles/timer';
import { useFriendSocketEvents } from '../hooks/useFriendSocketEvents';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  PROFILE_INNER_COLORS,
  getProfileInnerColor,
} from '../utils/profileIconColor';

// ── 상수 ────────────────────────────────────────────────
export const FRIEND_ICON_COLORS = PROFILE_INNER_COLORS;
export const getFriendIconColorByIndex = (i) => getProfileInnerColor(i);
const DEBUG_FRIEND_STORY_BORDER = false;
const debugFriendStoryBorder = (color) =>
  DEBUG_FRIEND_STORY_BORDER ? { borderWidth: 1, borderColor: color } : null;

// 백엔드 친구 목록과 연동하므로 더미 데이터는 사용하지 않는다.
export const INITIAL_FRIENDS = [];

// ── 쿡 찌르기 팝업 ──────────────────────────────────────
export const PokeModal = ({
  visible,
  friend,
  onClose,
  onPoke,
  onNotifyLater,
  onMessage,
  pokeLockedSeconds = 0,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createTimerFriendModalStyles(normalize), [normalize]);

  if (!visible || !friend) return null;
  const isStudying = friend.isActive === true;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={s.pokeOverlay}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={s.pokeWrapper}>
        <View style={s.pokePopup}>

          {/* 친구 정보 */}
          <View style={s.pokeFriendRow}>
            <View style={s.pokeAvatar}>
              <ProfileIcon
                width={normalize(45)}
                height={normalize(45)}
                color={getProfileInnerColor(
                  friend.colorId ??
                    friend.profileColorId ??
                    friend.profile_color_id ??
                    friend.colorIndex,
                )}
              />
              {isStudying ? (
                <View style={s.pokeStudyingBadge} />
              ) : (
                <View style={s.pokeIdleBadge} />
              )}
            </View>
            <View>
              <Text style={s.pokeFriendName}>{friend.name}</Text>
              <Text style={s.pokeStatusText}>
                {isStudying ? '공부 중' : '쉬는 중'}
              </Text>
            </View>
          </View>

          {/* 상태별 분기 */}
          {isStudying ? (
            <>
              <TouchableOpacity
                style={s.pokePrimaryBtn}
                onPress={onNotifyLater}
                activeOpacity={0.8}
              >
                <View style={s.pokePrimaryBtnContent}>
                  <Ionicons
                    name="notifications"
                    style={[s.pokeNotificationBtnIcon, { color: colors.primary }]}
                  />
                  <View style={s.pokePrimaryBtnTextGroup}>
                    <Text style={s.pokeInfoTitle}>기다림 알림 보내기</Text>
                    <Text style={s.pokeInfoDesc}>
                      공부가 끝나면 기다렸다고 알림을 보낼게요
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  s.pokePrimaryBtn,
                  pokeLockedSeconds > 0 && s.btnDisabled,
                ]}
                onPress={onPoke}
                activeOpacity={0.8}
                disabled={pokeLockedSeconds > 0}
              >
                <View style={s.pokePrimaryBtnContent}>
                  <MaterialCommunityIcons
                    name="hand-pointing-right"
                    style={s.pokeInfoEmoji}
                  />
                  <View style={s.pokePrimaryBtnTextGroup}>
                    <Text style={s.pokeInfoTitle}>쿡 찌르기</Text>
                    <Text style={s.pokeInfoDesc}>
                      {pokeLockedSeconds > 0
                        ? `${pokeLockedSeconds}초 후 다시 보낼 수 있어요.`
                        : '친구에게 공부하자고 알림을 보낼 수 있어요.'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={s.pokeMessageBtn}
            onPress={() => onMessage?.()}
            activeOpacity={0.8}
          >
            <View style={s.pokePrimaryBtnContent}>
              <Ionicons name="chatbubble" style={s.pokeMessageBtnIcon} />
              <View style={s.pokePrimaryBtnTextGroup}>
                <Text style={s.pokeInfoTitle}>메시지 보내기</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * FriendPokeController
 * - 쿡 찌르기 관련 비즈니스 로직(소켓 emit + 토스트)을 여기서만 관리
 * - Timer 화면은 pokeTarget/pokeVisible/state만 관리하고, 이 컴포넌트만 렌더링
 */
export const FriendPokeController = ({ visible, friend, onClose }) => {
  const { showToast } = useToast();
  const [cooldownByUserId, setCooldownByUserId] = useState({});
  const [nowMs, setNowMs] = useState(Date.now());
  const activeFriendId = friend?.id != null ? String(friend.id) : null;
  const pokeLockedSeconds = activeFriendId
    ? Math.max(
        0,
        Math.ceil(((cooldownByUserId[activeFriendId] ?? 0) - nowMs) / 1000),
      )
    : 0;
  const { emitFriendPoke, emitFriendNotifyOnStop } = useFriendSocketEvents({
    onFriendPokeResult: (payload) => {
      if (payload?.throttled) {
        if (activeFriendId) {
          setCooldownByUserId((prev) => ({
            ...prev,
            [activeFriendId]: Date.now() + 30 * 1000,
          }));
        }
        showToast('같은 친구에게는 30초 뒤 다시 쿡 찌르기 할 수 있어요');
      }
    },
  });
  const navigation = useNavigation();
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);


  const pushToast = (senderName, body) => {
    const s = String(senderName || '').trim();
    const b = String(body || '').trim();
    if (!b) return;
    const hasSender = s.length > 0;
    showToast({
      message: hasSender ? `${s} ${b}` : b,
      senderName: hasSender ? s : null,
      body: hasSender ? b : null,
      showProgress: true,
    });
  };

  const handleClose = () => {
    onClose?.();
  };

  const handleMessage = async () => {
    if (!friend) return;
    try {
      const res = await api.post('/api/dm/rooms', { otherUserId: friend.id });
      const roomId = res.data?.data?.id;
      if (roomId == null) {
        pushToast('메시지', '전송 준비 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요');
        return;
      }
      handleClose();
      navigation.navigate('DMChat', { roomId, friend });
    } catch (e) {
      pushToast('메시지', '전송 준비 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요');
    }
  };

  const handlePoke = () => {
    if (pokeLockedSeconds > 0) {
      showToast(`${pokeLockedSeconds}초 후 다시 쿡 찌르기 할 수 있어요`);
      return;
    }
    if (friend) {
      emitFriendPoke(friend.id);
      setCooldownByUserId((prev) => ({
        ...prev,
        [String(friend.id)]: Date.now() + 30 * 1000,
      }));
      pushToast('', `${friend.name} 님에게 공부하자는 알림을 보냈어요`);
    }
    handleClose();
  };

  const handleNotifyLater = () => {
    if (friend) {
      emitFriendNotifyOnStop(friend.id);
      pushToast('', `${friend.name} 님의 공부가 끝나면 기다렸다는 알림을 보낼게요`);
    }
    handleClose();
  };

  return (
    <PokeModal
      visible={visible}
      friend={friend}
      onClose={handleClose}
      onPoke={handlePoke}
      onNotifyLater={handleNotifyLater}
      onMessage={handleMessage}
      pokeLockedSeconds={pokeLockedSeconds}
    />
  );
};

// ── 친구 추가 팝업 ──────────────────────────────────────
export const AddFriendModal = ({ visible, onClose, onAdd }) => {
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createTimerFriendModalStyles(normalize), [normalize]);
  const translateY = useSharedValue(0);
  const LOG_PREFIX = '[AddFriendModal]';

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
      onEnd: (e) => {
        'worklet';
        translateY.value = -e.height;
      },
    },
    [],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    console.log(`${LOG_PREFIX} visible changed`, { visible });
    if (!visible) setQuery('');
  }, [visible]);

  useEffect(() => {
    if (!visible) translateY.value = 0;
  }, [translateY, visible]);

  const handleAdd = () => {
    console.log(`${LOG_PREFIX} handleAdd pressed`, { query });
    if (!query.trim()) return;
    onAdd(query.trim());
    setQuery('');
  };

  if (!visible) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => console.log(`${LOG_PREFIX} modal onShow`)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={s.addFriendOverlay}
            onPress={() => {
              console.log(`${LOG_PREFIX} overlay pressed`);
              onClose?.();
            }}
            activeOpacity={1}
          />
          <Reanimated.View style={[s.addFriendWrapper, animStyle]}>
            <View style={s.addFriendPopup}>
              <Text style={s.addFriendTitle}>친구 추가</Text>

              <View style={s.addFriendInputRow}>
                <Ionicons
                  name="search-outline"
                  size={normalize(18)}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={s.addFriendInput}
                  placeholder="@아이디 입력"
                  placeholderTextColor={colors.textLight20}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                  onFocus={() => console.log(`${LOG_PREFIX} input onFocus`)}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons
                      name="close-circle"
                      size={normalize(18)}
                      color={colors.textLight20}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  s.addFriendPrimaryBtn,
                  !query.trim() && s.addFriendPrimaryBtnDisabled,
                ]}
                onPress={handleAdd}
                activeOpacity={0.8}
                disabled={!query.trim()}
              >
                <FontAwesome5
                  name="user-plus"
                  size={normalize(16)}
                  color={colors.textWhite}
                  style={s.addFriendPrimaryBtnIcon}
                />
                <Text style={s.addFriendPrimaryBtnText}>추가하기</Text>
              </TouchableOpacity>
            </View>
          </Reanimated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── 친구 목록 UI (FriendStoryBar) ──────────────────────
/**
 * Props:
 *   friends          - 친구 배열
 *   normalize        - 반응형 사이즈 함수
 *   styles           - createTimerStyles 결과
 *   onFriendPress    - (friend) => void
 *   onAddFriendPress - () => void
 */
export const FriendStoryBar = memo(function FriendStoryBar({
  friends,
  studyingFriends = {},
  normalize,
  styles,
  onFriendPress,
  onAddFriendPress,
}) {
  const orderedFriends = useMemo(() => {
    const activeFriends = friends.filter((f) => studyingFriends[f.id] === true);
    const inactiveFriends = friends.filter(
      (f) => studyingFriends[f.id] !== true,
    );
    // 비활성 친구 순서는 고정(원본 배열 순서 유지), 공부 중 친구만 앞쪽 배치
    return [...activeFriends, ...inactiveFriends];
  }, [friends, studyingFriends]);

  return (
    <View style={[styles.friendStoryRow, debugFriendStoryBorder('#FF3B30')]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.friendStoryScroll,
          debugFriendStoryBorder('#FF9500'),
        ]}
      >
        {/* 친구 추가 버튼 */}
        <TouchableOpacity
          style={[
            styles.friendStoryAddCircleWrap,
            debugFriendStoryBorder('#FFCC00'),
          ]}
          onPress={onAddFriendPress}
          activeOpacity={0.8}
        >
          <View style={[styles.friendStoryAddCircle, debugFriendStoryBorder('#34C759')]}>
            <Ionicons name="add" size={normalize(28)} color={colors.primary} />
          </View>
          <Text style={[styles.friendStoryAddLabel, debugFriendStoryBorder('#30B0C7')]}>
            친구 추가
          </Text>
        </TouchableOpacity>

        {/* 친구 목록 */}
        {orderedFriends.map((friend) => {
          const isActive = studyingFriends[friend.id] === true; // 정렬 기준과 동일
          const iconColor = getProfileInnerColor(
            friend.colorId ??
              friend.profileColorId ??
              friend.profile_color_id ??
              friend.colorIndex,
          );
          return (
            <TouchableOpacity
              key={friend.id}
              style={[
                styles.friendStoryCircleWrap,
                debugFriendStoryBorder('#0A84FF'),
              ]}
              onPress={() => onFriendPress(friend)}
              activeOpacity={0.8}
            >
              <View style={[styles.friendStoryCircle, debugFriendStoryBorder('#5E5CE6')]}>
                <ProfileIcon
                  width={normalize(56)}
                  height={normalize(56)}
                  color={iconColor}
                />
                <View
                  style={[
                    styles.friendStatusDotOnCircle,
                    isActive
                      ? styles.friendStatusDotActive
                      : styles.friendStatusDotInactive,
                    debugFriendStoryBorder('#BF5AF2'),
                  ]}
                />
              </View>
              <Text
                style={[styles.friendStoryName, debugFriendStoryBorder('#FF2D55')]}
                numberOfLines={1}
              >
                {friend.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});
