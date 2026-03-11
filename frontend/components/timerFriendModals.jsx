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

// ── 상수 ────────────────────────────────────────────────
export const FRIEND_ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue];
export const getFriendIconColorByIndex = (i) => FRIEND_ICON_COLORS[i % FRIEND_ICON_COLORS.length];

export const INITIAL_FRIENDS = [
  { id: 1, name: '친구20260302', colorIndex: 0, isActive: true },
  { id: 2, name: '친구2',         colorIndex: 1, isActive: false },
  { id: 3, name: '친구3',         colorIndex: 2, isActive: false },
];

// ── 쿡 찌르기 팝업 ──────────────────────────────────────
export const PokeModal = ({ visible, friend, onClose, onPoke, onNotifyLater }) => {
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
                <Text style={pokeModalStyles.primaryBtnText}>공부 끝나면 알려줘!</Text>
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

          <TouchableOpacity style={pokeModalStyles.cancelBtn} onPress={onClose}>
            <Text style={pokeModalStyles.cancelBtnText}>취소</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
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

// ── 토스트 ──────────────────────────────────────────────
export const Toast = ({ message, visible, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }
  }, [visible, message]);

  if (!visible || !message) return null;
  return (
    <Animated.View style={[toastStyles.toast, { opacity }]} pointerEvents="none">
      <Text style={toastStyles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const toastStyles = {
  toast:     { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: 'rgba(40,40,40,0.88)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  toastText: { fontSize: 13, color: colors.textWhite, fontWeight: '500' },
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
export const FriendStoryBar = ({ friends, normalize, styles, onFriendPress, onAddFriendPress }) => (
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
      {friends.map((friend) => {
        const iconColor = getFriendIconColorByIndex(friend.colorIndex);
        return (
          <TouchableOpacity
            key={friend.id}
            style={styles.friendStoryCircleWrap}
            onPress={() => onFriendPress(friend)}
            activeOpacity={0.8}
          >
            <View style={[styles.friendStoryCircle, { backgroundColor: colors.primaryLight30, borderColor: colors.primary }]}>
              <MessageTabIcon width={normalize(22)} height={normalize(22)} color={iconColor} />
              <View style={[
                styles.friendStatusDotOnCircle,
                friend.isActive ? styles.friendStatusDotActive : styles.friendStatusDotInactive,
              ]} />
            </View>
            <Text style={styles.friendStoryName} numberOfLines={1}>{friend.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);