/**
 * timerFriendModals.jsx
 * 친구 목록 UI + PokeModal + AddFriendModal + Toast
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MessageTabIcon from '../assets/Group 166.svg';
import { colors } from '../styles/colors';
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
      <TouchableOpacity style={pokeModalStyles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={pokeModalStyles.wrapper}>
        <Animated.View style={[pokeModalStyles.popup, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={pokeModalStyles.handle} />

          {/* 친구 정보 */}
          <View style={pokeModalStyles.friendRow}>
            <View style={[pokeModalStyles.avatar, { backgroundColor: colors.primaryLight30 }]}>
              <MessageTabIcon width={28} height={28} color={getFriendIconColorByIndex(friend.colorIndex)} />
              {isStudying && <View style={pokeModalStyles.studyingBadge} />}
            </View>
            <View>
              <Text style={pokeModalStyles.friendName}>{friend.name}</Text>
              <Text style={pokeModalStyles.statusText}>
                {isStudying ? '공부 중' : '공부 안 하는 중'}
              </Text>
            </View>
          </View>

          <View style={pokeModalStyles.divider} />

          {/* 상태별 분기 */}
          {isStudying ? (
            <>
              <View style={pokeModalStyles.infoBox}>
                <Text style={pokeModalStyles.infoEmoji}>🤫</Text>
                <View>
                  <Text style={pokeModalStyles.infoTitle}>쉿, 공부 중이에요</Text>
                  <Text style={pokeModalStyles.infoDesc}>공부가 끝나면 알려달라고 요청할 수 있어요.</Text>
                </View>
              </View>
              <TouchableOpacity style={pokeModalStyles.primaryBtn} onPress={onNotifyLater} activeOpacity={0.8}>
                <Text style={pokeModalStyles.primaryBtnText}>🔔 공부 끝나면 알려줘!</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={pokeModalStyles.infoBox}>
                <Text style={pokeModalStyles.infoEmoji}>👉</Text>
                <View>
                  <Text style={pokeModalStyles.infoTitle}>쿡 찌르기</Text>
                  <Text style={pokeModalStyles.infoDesc}>친구에게 공부하자고 알림을 보낼 수 있어요.</Text>
                </View>
              </View>
              <TouchableOpacity style={pokeModalStyles.primaryBtn} onPress={onPoke} activeOpacity={0.8}>
                <Text style={pokeModalStyles.primaryBtnText}>👉 공부하자!</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={pokeModalStyles.messageBtn}
            onPress={() => onMessage?.()}
            activeOpacity={0.8}
          >
            <Text style={pokeModalStyles.messageBtnText}>💬 메시지 보내기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={pokeModalStyles.cancelBtn} onPress={onClose}>
            <Text style={pokeModalStyles.cancelBtnText}>취소</Text>
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

const pokeModalStyles = {
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  wrapper:       { position: 'absolute', bottom: 0, left: 0, right: 0 },
  popup:         { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  handle:        { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  friendRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:        { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  studyingBadge: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#52B788' },
  friendName:    { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  statusText:    { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  divider:       { height: 1, backgroundColor: '#F0F0F0', marginBottom: 16 },
  infoBox:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FBF9', borderRadius: 14, padding: 14, gap: 12, marginBottom: 16 },
  infoEmoji:     { fontSize: 28 },
  infoTitle:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  infoDesc:      { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  primaryBtn:    { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  primaryBtnText:{ fontSize: 15, fontWeight: '700', color: colors.textWhite },
  messageBtn:    { backgroundColor: colors.primary, opacity: 0.85, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  messageBtnText:{ color: colors.textWhite, fontSize: 15, fontWeight: '600' },
  cancelBtn:     { paddingVertical: 12, alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 14 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
};

// ── 친구 추가 팝업 ──────────────────────────────────────
export const AddFriendModal = ({ visible, onClose, onAdd }) => {
  const [query, setQuery] = useState('');

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
      <TouchableOpacity style={addFriendStyles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={addFriendStyles.wrapper}>
        <View style={addFriendStyles.popup}>
          <View style={addFriendStyles.handle} />
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
            style={[addFriendStyles.primaryBtn, !query.trim() && addFriendStyles.btnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={!query.trim()}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.textWhite} style={{ marginRight: 6 }} />
            <Text style={addFriendStyles.primaryBtnText}>추가하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={addFriendStyles.cancelBtn} onPress={onClose}>
            <Text style={addFriendStyles.cancelBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const addFriendStyles = {
  overlay:        { flex: 1, backgroundColor: 'transparent' },
  wrapper:        { position: 'absolute', bottom: 0, left: 0, right: 0 },
  popup:          { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  handle:         { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:          { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtitle:       { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8, marginBottom: 16 },
  input:          { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  primaryBtn:     { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.textWhite },
  cancelBtn:      { paddingVertical: 12, alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 14 },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  btnDisabled:    { opacity: 0.4 },
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
export const FriendStoryBar = ({ friends, studyingFriends = {}, normalize, styles, onFriendPress, onAddFriendPress }) => {
  // 활동 중인 친구는 항상 앞에, 나머지는 랜덤 섞기
  const activeFriends = friends.filter((f) => f.isActive);
  const inactiveFriends = friends.filter((f) => !f.isActive);
  const shuffledInactive = [...inactiveFriends];
  for (let i = shuffledInactive.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledInactive[i], shuffledInactive[j]] = [shuffledInactive[j], shuffledInactive[i]];
  }
  const orderedFriends = [...activeFriends, ...shuffledInactive];

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
          const isActive = studyingFriends[friend.id] === true;
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
};