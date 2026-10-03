/**
 * timerFriendModals.jsx
 * 친구 목록 UI + PokeModal + AddFriendModal + Toast
 */

import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Easing,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import ImageViewer from '../view/src/ImageViewer';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GuideFocusTarget } from './guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../src/screens/UserGuide/guideFocusTargets';
import UserAvatar, { pickAvatarUrl } from './UserAvatar';
import { colors } from '../styles/colors';
import { createTimerFriendModalStyles, getNormalize } from '../styles/timer';
import Skeleton from './common/Skeleton';
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
  onAvatarPress,
  pokeLockedSeconds = 0,
}) => {
  const { width, height: screenH } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createTimerFriendModalStyles(normalize), [normalize]);
  const sheetTranslateY = useRef(new Animated.Value(screenH)).current;

  useEffect(() => {
    if (!visible || !friend) return undefined;
    sheetTranslateY.setValue(screenH);
    const anim = Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, friend, screenH, sheetTranslateY]);

  if (!visible || !friend) return null;
  const avatarUri = pickAvatarUrl(friend);
  const isStudying = friend.isActive === true;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity
        style={s.pokeOverlay}
        onPress={onClose}
        activeOpacity={1}
      />
      <Animated.View
        style={[s.pokeWrapper, { transform: [{ translateY: sheetTranslateY }] }]}
      >
        {isStudying || pokeLockedSeconds > 0 ? (
          <View style={s.pokeOutsideDescWrap}>
            {isStudying ? (
              <Text style={s.pokeOutsideDesc}>
                공부가 끝나면 기다렸다고 알림을 보낼게요
              </Text>
            ) : (
              <Text style={s.pokeOutsideDesc}>
                {`${pokeLockedSeconds}초 후 다시 보낼 수 있어요`}
              </Text>
            )}
          </View>
        ) : null}
        <View style={s.pokePopup}>
          <Pressable
            onPress={avatarUri ? onAvatarPress : undefined}
            disabled={!avatarUri}
            style={s.pokeFriendRow}
            accessibilityLabel={
              avatarUri ? '프로필 사진 크게 보기' : undefined
            }
          >
            <View style={s.pokeAvatar}>
              <UserAvatar
                uri={avatarUri}
                size={normalize(45)}
                colorId={
                  friend.colorId ??
                  friend.profileColorId ??
                  friend.profile_color_id ??
                  friend.colorIndex
                }
              />
              {isStudying ? (
                <View style={s.pokeStudyingBadge} />
              ) : (
                <View style={s.pokeIdleBadge} />
              )}
            </View>
            <View style={s.pokeFriendTextBox}>
              <View style={s.pokeFriendNameRow}>
                <Text style={s.pokeFriendName}>{friend.name}</Text>
                {friend.username ? (
                  <Text style={s.pokeFriendUsername}>{friend.username}</Text>
                ) : null}
              </View>
              <Text style={s.pokeStatusText}>
                {isStudying ? '공부 중' : '쉬는 중'}
              </Text>
            </View>
          </Pressable>
          <View style={s.pokeActionRow}>
            {isStudying ? (
              <TouchableOpacity
                style={s.pokeActionCard}
                onPress={onNotifyLater}
                activeOpacity={0.8}
              >
                <View style={s.pokeActionIcon}>
                  <Ionicons
                    name="notifications"
                    size={normalize(22)}
                    color={colors.primaryDark}
                  />
                </View>
                <Text style={s.pokeActionCardText}>기다림 알림</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.pokeActionCard, pokeLockedSeconds > 0 && s.btnDisabled]}
                onPress={onPoke}
                activeOpacity={0.8}
                disabled={pokeLockedSeconds > 0}
              >
                <View style={s.pokeActionIcon}>
                  <MaterialCommunityIcons
                    name="hand-pointing-right"
                    size={normalize(22)}
                    color={colors.primaryDark}
                  />
                </View>
                <Text style={s.pokeActionCardText}>쿡 찌르기</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.pokeMessageCard}
              onPress={() => onMessage?.()}
              activeOpacity={0.8}
            >
              <View style={s.pokeMessageIcon}>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={normalize(22)}
                  color={colors.text}
                />
              </View>
              <Text style={s.pokeMessageCardText}>메시지 보내기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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
  const [viewerUri, setViewerUri] = useState(null);
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
    if (!visible) return undefined;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, [visible]);

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
    setViewerUri(null);
    onClose?.();
  };

  const handleMessage = async () => {
    if (!friend) return;
    try {
      const res = await api.post('/api/dm/rooms', { otherUserId: friend.id });
      const roomId = res.data?.data?.id;
      if (roomId == null) {
        pushToast(
          '메시지',
          '전송 준비 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요',
        );
        return;
      }
      handleClose();
      navigation.navigate('DMChat', { roomId, friend });
    } catch (e) {
      pushToast(
        '메시지',
        '전송 준비 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요',
      );
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
      pushToast(
        '',
        `${friend.name} 님의 공부가 끝나면 기다렸다는 알림을 보낼게요`,
      );
    }
    handleClose();
  };

  const avatarUri = pickAvatarUrl(friend);

  const handleAvatarPress = () => {
    if (!avatarUri) return;
    setViewerUri(avatarUri);
  };

  const handleViewerClose = () => setViewerUri(null);

  return (
    <>
      <PokeModal
        visible={visible}
        friend={friend}
        onClose={handleClose}
        onPoke={handlePoke}
        onNotifyLater={handleNotifyLater}
        onMessage={handleMessage}
        onAvatarPress={handleAvatarPress}
        pokeLockedSeconds={pokeLockedSeconds}
      />
      <ImageViewer
        visible={Boolean(viewerUri)}
        uri={viewerUri}
        onClose={handleViewerClose}
      />
    </>
  );
};

// ── 친구 추가 팝업 ──────────────────────────────────────
export const AddFriendModal = ({ visible, onClose, onAdd }) => {
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createTimerFriendModalStyles(normalize), [normalize]);
  const translateY = useSharedValue(0);

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
    if (!visible) setQuery('');
  }, [visible]);

  useEffect(() => {
    if (!visible) translateY.value = 0;
  }, [translateY, visible]);

  const handleAdd = () => {
    if (!query.trim()) return;
    onAdd(query.trim());
    setQuery('');
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={s.addFriendOverlay}
            onPress={onClose}
            activeOpacity={1}
          />
          <Reanimated.View style={[s.addFriendWrapper, animStyle]}>
            <View style={s.addFriendPopup}>
              <Text style={s.addFriendTitle}>친구 추가</Text>

              <View style={s.addFriendInputRow}>
                <Ionicons
                  name="search-outline"
                  size={normalize(18)}
                  color={colors.textLight4}
                />
                <TextInput
                  style={s.addFriendInput}
                  placeholder="@아이디 입력"
                  placeholderTextColor={colors.textLight2}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons
                      name="close-circle"
                      size={normalize(18)}
                      color={colors.textLight2}
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
                  color={colors.white}
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
  loading = false,
}) {
  const orderedFriends = useMemo(() => {
    const suggestions = friends.filter((f) => f.isSuggestion);
    const realFriends = friends.filter((f) => !f.isSuggestion);
    const activeFriends = realFriends.filter(
      (f) => studyingFriends[f.id] === true,
    );
    const inactiveFriends = realFriends.filter(
      (f) => studyingFriends[f.id] !== true,
    );
    const base = [...activeFriends, ...inactiveFriends];
    if (!suggestions.length) return base;

    const result = [...base];
    suggestions.forEach((suggestion, index) => {
      // 앞쪽에 추천을 섞되, 친구 목록이 길면 뒤로 밀려 가로 스크롤
      const insertAt = Math.min(index + 1, result.length);
      result.splice(insertAt, 0, suggestion);
    });
    return result;
  }, [friends, studyingFriends]);

  return (
    <GuideFocusTarget
      name={T.TIMER_FRIEND_BAR}
      style={[styles.friendStoryRow, debugFriendStoryBorder('#FF3B30')]}
    >
      <TouchableOpacity
        style={[
          styles.friendStoryAddCircleWrap,
          debugFriendStoryBorder('#FFCC00'),
        ]}
        onPress={onAddFriendPress}
        activeOpacity={0.8}
        disabled={loading}
      >
        <View
          style={[
            styles.friendStoryAddCircle,
            debugFriendStoryBorder('#34C759'),
          ]}
        >
          <Ionicons name="add" size={normalize(25)} color={colors.primary} />
        </View>
        <Text
          style={[
            styles.friendStoryAddLabel,
            debugFriendStoryBorder('#30B0C7'),
          ]}
        >
          친구 추가
        </Text>
      </TouchableOpacity>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.friendStoryScrollView}
        contentContainerStyle={[
          styles.friendStoryScroll,
          debugFriendStoryBorder('#FF9500'),
        ]}
      >

        {loading
          ? [0, 1, 2].map((i) => (
              <View
                key={`friend-skel-${i}`}
                style={styles.friendStoryCircleWrap}
              >
                <Skeleton
                  width={normalize(50)}
                  height={normalize(50)}
                  borderRadius={normalize(25)}
                />
                <Skeleton
                  width={normalize(40)}
                  height={normalize(10)}
                  borderRadius={normalize(4)}
                  style={{ marginTop: normalize(6), alignSelf: 'center' }}
                />
              </View>
            ))
          : orderedFriends.map((friend) => {
          const isSuggestion = Boolean(friend.isSuggestion);
          const isActive =
            !isSuggestion && studyingFriends[friend.id] === true;
          return (
            <TouchableOpacity
              key={
                isSuggestion
                  ? `suggest-${friend.id}`
                  : `friend-${friend.id}`
              }
              style={[
                styles.friendStoryCircleWrap,
                debugFriendStoryBorder('#0A84FF'),
              ]}
              onPress={() => onFriendPress(friend)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.friendStoryCircle,
                  debugFriendStoryBorder('#5E5CE6'),
                ]}
              >
                <UserAvatar
                  uri={pickAvatarUrl(friend)}
                  size={normalize(50)}
                  colorId={
                    friend.colorId ??
                      friend.profileColorId ??
                      friend.profile_color_id ??
                      friend.colorIndex
                  }
                />
                {isSuggestion ? (
                  <View
                    style={[
                      styles.friendStatusDotOnCircle,
                      styles.friendSuggestBadge,
                      debugFriendStoryBorder('#BF5AF2'),
                    ]}
                  >
                    <Ionicons
                      name="person-add"
                      size={normalize(10)}
                      color={colors.white}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.friendStatusDotOnCircle,
                      isActive
                        ? styles.friendStatusDotActive
                        : styles.friendStatusDotInactive,
                      debugFriendStoryBorder('#BF5AF2'),
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.friendStoryName,
                  debugFriendStoryBorder('#FF2D55'),
                ]}
                numberOfLines={1}
              >
                {isSuggestion
                  ? friend.username || friend.name || ''
                  : friend.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </GuideFocusTarget>
  );
});
