/**
 * timerFriendModals.jsx
 * 친구 목록 UI + PokeModal + AddFriendModal + Toast
 */

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MessageTabIcon from '../assets/Group 166.svg';
import { colors } from '../styles/colors';
import { createTimerFriendModalStyles, getNormalize } from '../styles/timer';
import { useFriendSocketEvents } from '../hooks/useFriendSocketEvents';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

// ── 상수 ────────────────────────────────────────────────
export const FRIEND_ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue];
export const getFriendIconColorByIndex = (i) => FRIEND_ICON_COLORS[i % FRIEND_ICON_COLORS.length];

// 백엔드 친구 목록과 연동하므로 더미 데이터는 사용하지 않는다.
export const INITIAL_FRIENDS = [];

// ── 쿡 찌르기 팝업 ──────────────────────────────────────
export const PokeModal = ({ visible, friend, onClose, onPoke, onNotifyLater, onMessage }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createTimerFriendModalStyles(normalize), [normalize]);

  useEffect(() => {
    if (visible && friend) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue:  6, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeAnim, { toValue:  0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, friend]);

  if (!visible || !friend) return null;
  const isStudying = friend.isActive === true;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.pokeOverlay} onPress={onClose} activeOpacity={1} />
      <View style={s.pokeWrapper}>
        <Animated.View style={[s.pokePopup, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={s.pokeHandle} />

          {/* 친구 정보 */}
          <View style={s.pokeFriendRow}>
            <View style={s.pokeAvatar}>
              <MessageTabIcon
                width={normalize(28)}
                height={normalize(28)}
                color={getFriendIconColorByIndex(friend.colorIndex)}
              />
              {isStudying && <View style={s.pokeStudyingBadge} />}
            </View>
            <View>
              <Text style={s.pokeFriendName}>{friend.name}</Text>
              <Text style={s.pokeStatusText}>
                {isStudying ? '공부 중' : '공부 안 하는 중'}
              </Text>
            </View>
          </View>

          <View style={s.pokeDivider} />

          {/* 상태별 분기 */}
          {isStudying ? (
            <>
              <View style={s.pokeInfoBox}>
                <Text style={s.pokeInfoEmoji}>🤫</Text>
                <View>
                  <Text style={s.pokeInfoTitle}>쉿, 공부 중이에요</Text>
                  <Text style={s.pokeInfoDesc}>공부가 끝나면 알려달라고 요청할 수 있어요.</Text>
                </View>
              </View>
              <TouchableOpacity style={s.pokePrimaryBtn} onPress={onNotifyLater} activeOpacity={0.8}>
                <Text style={s.pokePrimaryBtnText}>🔔 공부 끝나면 알려줘!</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.pokeInfoBox}>
                <Text style={s.pokeInfoEmoji}>👉</Text>
                <View>
                  <Text style={s.pokeInfoTitle}>쿡 찌르기</Text>
                  <Text style={s.pokeInfoDesc}>친구에게 공부하자고 알림을 보낼 수 있어요.</Text>
                </View>
              </View>
              <TouchableOpacity style={s.pokePrimaryBtn} onPress={onPoke} activeOpacity={0.8}>
                <Text style={s.pokePrimaryBtnText}>👉 공부하자!</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={s.pokeMessageBtn}
            onPress={() => onMessage?.()}
            activeOpacity={0.8}
          >
            <Text style={s.pokeMessageBtnText}>💬 메시지 보내기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.pokeCancelBtn} onPress={onClose}>
            <Text style={s.pokeCancelBtnText}>취소</Text>
          </TouchableOpacity>
        </Animated.View>
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
  const { emitFriendPoke, emitFriendNotifyOnStop } = useFriendSocketEvents();
  const navigation = useNavigation();

  const pushToast = (senderName, body) => {
    const s = String(senderName || '알림').trim();
    const b = String(body || '').trim();
    if (!b) return;
    showToast({
      message: `${s}: ${b}`,
      senderName: s,
      body: b,
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
        pushToast('메시지', '전송 준비 중 오류가 발생했어요');
        return;
      }
      handleClose();
      navigation.navigate('DMChat', { roomId, friend });
    } catch (e) {
      pushToast('메시지', '전송 준비 중 오류가 발생했어요');
    }
  };

  const handlePoke = () => {
    if (friend) {
      emitFriendPoke(friend.id);
      pushToast(friend.name, '공부하자! 알림을 보냈어요');
    }
    handleClose();
  };

  const handleNotifyLater = () => {
    if (friend) {
      emitFriendNotifyOnStop(friend.id);
      pushToast(friend.name, '공부 완료 시 알림을 예약했어요');
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
    />
  );
};

// ── 친구 추가 팝업 ──────────────────────────────────────
export const AddFriendModal = ({ visible, onClose, onAdd }) => {
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createTimerFriendModalStyles(normalize), [normalize]);

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const handleAdd = () => {
    if (!query.trim()) return;
    onAdd(query.trim());
    setQuery('');
  };

  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.addFriendOverlay} onPress={onClose} activeOpacity={1} />
      <View style={s.addFriendWrapper}>
        <View style={s.addFriendPopup}>
          <View style={s.addFriendHandle} />
          <Text style={s.addFriendTitle}>친구 추가</Text>
          <Text style={s.addFriendSubtitle}>아이디로 친구를 검색하세요</Text>

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
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={normalize(16)}
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
            <Ionicons
              name="person-add-outline"
              size={normalize(16)}
              color={colors.textWhite}
              style={s.addFriendPrimaryBtnIcon}
            />
            <Text style={s.addFriendPrimaryBtnText}>추가하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.addFriendCancelBtn} onPress={onClose}>
            <Text style={s.addFriendCancelBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    const inactiveFriends = friends.filter((f) => studyingFriends[f.id] !== true);
    const shuffledInactive = [...inactiveFriends];
    for (let i = shuffledInactive.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledInactive[i], shuffledInactive[j]] = [shuffledInactive[j], shuffledInactive[i]];
    }
    return [...activeFriends, ...shuffledInactive];
  }, [friends, studyingFriends]);

  return (
    <View style={styles.friendStoryRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.friendStoryScroll}
      >
        {/* 친구 추가 버튼 */}
        <TouchableOpacity
          style={styles.friendStoryAddCircleWrap}
          onPress={onAddFriendPress}
          activeOpacity={0.8}
        >
          <View style={styles.friendStoryAddCircle}>
            <Ionicons name="add" size={normalize(28)} color={colors.primary} />
          </View>
          <Text style={styles.friendStoryAddLabel}>친구 추가</Text>
        </TouchableOpacity>

        {/* 친구 목록 */}
        {orderedFriends.map((friend) => {
          const isActive = studyingFriends[friend.id] === true; // 정렬 기준과 동일
          const iconColor = getFriendIconColorByIndex(friend.colorIndex);
          return (
            <TouchableOpacity
              key={friend.id}
              style={styles.friendStoryCircleWrap}
              onPress={() => onFriendPress(friend)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.friendStoryCircle,
                  { backgroundColor: colors.primaryLight30, borderColor: colors.primary },
                ]}
              >
                <MessageTabIcon width={normalize(22)} height={normalize(22)} color={iconColor} />
                <View
                  style={[
                    styles.friendStatusDotOnCircle,
                    isActive ? styles.friendStatusDotActive : styles.friendStatusDotInactive,
                  ]}
                />
              </View>
              <Text style={styles.friendStoryName} numberOfLines={1}>
                {friend.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});