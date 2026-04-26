import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../../utils/api';
import { useFriend } from '../../context/FriendContext';
import { colors } from '../../styles/colors';
import SubHeader from '../frame/subHeader';
import { createFriendStyles } from '../../styles/friend.style';
import ProfileIcon from '../../assets/Profile.svg';
import { getNormalize } from '../../styles/frame.style';
import {
  getProfileInnerColor,
} from '../../utils/profileIconColor';

// ── 컴포넌트 ─────────────────────────────────────────
const FriendsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createFriendStyles(normalize), [normalize]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null); // 바텀시트 대상
  const [modalVisible, setModalVisible] = useState(false);
  const { refreshFriendRequestBadge } = useFriend();

  // 화면 포커스 시 친구 요청 뱃지 갱신 (빨간점 해제 반영)
  useFocusEffect(
    React.useCallback(() => {
      refreshFriendRequestBadge?.({ reason: 'friends_screen_focus' });
    }, [refreshFriendRequestBadge]),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [friendsRes, reqRes] = await Promise.all([
          api.get('/api/friends/list'),
          api.get('/api/friends/requests/received'),
        ]);

        const friendsData = friendsRes.data?.data || [];
        const requestsData = reqRes.data?.data || [];
        if (__DEV__) {
          console.log('[ColorIdDebug][FriendsScreen] /api/friends/list sample:', {
            count: friendsData.length,
            first: friendsData[0]
              ? {
                  userId: friendsData[0].userId,
                  colorId: friendsData[0].colorId,
                  profileColorId: friendsData[0].profileColorId,
                  profile_color_id: friendsData[0].profile_color_id,
                  profileColor: friendsData[0].profileColor,
                }
              : null,
          });
          console.log('[ColorIdDebug][FriendsScreen] /api/friends/requests/received sample:', {
            count: requestsData.length,
            first: requestsData[0]
              ? {
                  userId: requestsData[0].userId,
                  colorId: requestsData[0].colorId,
                  profileColorId: requestsData[0].profileColorId,
                  profile_color_id: requestsData[0].profile_color_id,
                  profileColor: requestsData[0].profileColor,
                }
              : null,
          });
        }

        setFriends(
          friendsData.map((f) => ({
            id: f.userId,
            friendshipId: f.friendshipId,
            name: f.name,
            username: f.username,
            school: f.school,
            grade: f.grade,
            profileColorId:
              f.colorId ?? f.profileColorId ?? f.profile_color_id ?? f.profileColor?.id,
            profileColorHex: f.profileColor?.hexCode ?? null,
          })),
        );

        setFriendRequests(
          requestsData.map((r) => ({
            id: r.userId,
            requestId: r.requestId,
            name: r.name,
            username: r.username,
            school: r.school,
            grade: r.grade,
            profileColorId:
              r.colorId ?? r.profileColorId ?? r.profile_color_id ?? r.profileColor?.id,
            profileColorHex: r.profileColor?.hexCode ?? null,
          })),
        );
      } catch (error) {
        console.error('친구/요청 목록 조회 실패:', error);
      }
    };

    fetchData();
  }, []);

  const handleAcceptRequest = async (req) => {
    try {
      await api.post(`/api/friends/requests/${req.requestId}/accept`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFriends((prev) => [...prev, { ...req }]);
      refreshFriendRequestBadge?.({ reason: 'after_accept' });
    } catch (error) {
      console.error('친구 요청 수락 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message ||
          '친구 요청 수락 중 오류가 발생했습니다.',
      );
    }
  };

  const handleRejectRequest = async (req) => {
    try {
      await api.post(`/api/friends/requests/${req.requestId}/reject`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
      refreshFriendRequestBadge?.({ reason: 'after_reject' });
    } catch (error) {
      console.error('친구 요청 거절 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message ||
          '친구 요청 거절 중 오류가 발생했습니다.',
      );
    }
  };

  // 검색 필터
  const filtered = friends.filter(
    (f) =>
      f.name.includes(searchQuery) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.school.includes(searchQuery),
  );

  const openModal = (friend) => {
    setSelectedFriend(friend);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedFriend(null);
  };

  const handleDelete = () => {
    closeModal();
    Alert.alert(
      '친구 삭제',
      `${selectedFriend.name}님을 친구 목록에서 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/friends/${selectedFriend.id}`);
              setFriends((prev) =>
                prev.filter((f) => f.id !== selectedFriend.id),
              );
            } catch (error) {
              console.error('친구 삭제 실패:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message ||
                  '친구 삭제 중 오류가 발생했습니다.',
              );
            }
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    closeModal();
    Alert.alert(
      '차단',
      `${selectedFriend.name}님을 차단할까요?\n차단하면 개인우편과 타이머 활동 기능을 사용할수없어요`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/friends/${selectedFriend.id}/block`, {});
              setFriends((prev) =>
                prev.filter((f) => f.id !== selectedFriend.id),
              );
            } catch (error) {
              console.error('사용자 차단 실패:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message ||
                  '사용자 차단 중 오류가 발생했습니다.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <SubHeader
            title="친구"
            onBack={() => navigation?.goBack()}
            rightElement={<Text style={styles.friendCountChip}>{friends.length}명</Text>}
            rightDisabled
          />

      {/* ── 검색창 ── */}
          <View style={styles.searchWrapper}>
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="이름, 아이디, 학교 검색"
              placeholderTextColor={colors.textLight40}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textLight40} />
              </TouchableOpacity>
            )}
          </View>

      {/* ── 스크롤: 친구 요청 + 친구 목록 (함께 스크롤) ── */}
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
        {/* 친구 요청 (검색바 ↔ 친구목록 사이) */}
        {friendRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <View style={styles.requestsHeader}>
              <Text style={styles.requestsTitle}>친구 요청</Text>
              <Text style={styles.requestsCount}>
                {friendRequests.length}건
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.requestsScroll}
            >
              {friendRequests.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.reqAvatar}>
                    <ProfileIcon
                      width={normalize(40)}
                      height={normalize(40)}
                      color={getProfileInnerColor(req.profileColorId) || getProfileInnerColorBySeed(req.id)}
                    />
                  </View>
                  <Text style={styles.reqName} numberOfLines={1}>
                    {req.name}
                  </Text>
                  <Text style={styles.reqUsername} numberOfLines={1}>
                    {req.username}
                  </Text>
                  <View style={styles.reqButtons}>
                    <TouchableOpacity
                      style={styles.reqAcceptBtn}
                      onPress={() => handleAcceptRequest(req)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reqAcceptText}>수락</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reqRejectBtn}
                      onPress={() => handleRejectRequest(req)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reqRejectText}>거절</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 친구 목록 */}
        <Text style={styles.listSectionTitle}>친구 목록</Text>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textLight20} />
            <Text style={styles.emptyText}>
              {searchQuery.trim().length > 0
                ? '검색 결과가 없어요'
                : '친구 목록이 비어 있어요'}
            </Text>
          </View>
        ) : (
          filtered.map((friend) => (
            <View key={friend.id} style={styles.friendRow}>
              <View style={styles.avatar}>
                <ProfileIcon
                  width={normalize(35)}
                  height={normalize(35)}
                  color={getProfileInnerColor(friend.profileColorId) || getProfileInnerColorBySeed(friend.id)}
                />
              </View>
              <View style={styles.friendInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendUsername}>{friend.username}</Text>
                </View>
                <Text style={styles.friendSchool}>
                  {friend.school} {friend.grade}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.friendIconBtn}
                onPress={() => openModal(friend)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.alert}
                />
              </TouchableOpacity>
            </View>
          ))
        )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* ── 바텀시트 모달 ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        {/* 딤 배경 */}
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={closeModal}
          activeOpacity={1}
        />

        <View style={styles.bottomSheet}>
          {/* 핸들 */}
          <View style={styles.sheetHandle} />

          {/* 대상 친구 정보 */}
          {selectedFriend && (
            <>
              <View style={styles.sheetFriendInfo}>
                <View style={styles.sheetAvatar}>
                  <ProfileIcon
                    width={normalize(35)}
                    height={normalize(35)}
                    color={
                      getProfileInnerColor(selectedFriend.profileColorId) ||
                      getProfileInnerColorBySeed(selectedFriend.id)
                    }
                  />
                </View>
                <View>
                  <Text style={styles.sheetName}>{selectedFriend.name}</Text>
                  <Text style={styles.sheetUsername}>
                    {selectedFriend.username}
                  </Text>
                  <Text style={styles.sheetSchool}>
                    {selectedFriend.school} · {selectedFriend.grade}
                  </Text>
                </View>
              </View>

              <View style={styles.sheetDivider} />

              {/* 액션 버튼 */}
              <TouchableOpacity
                style={styles.sheetAction}
                onPress={handleDelete}
              >
                <View style={[styles.sheetActionIcon, styles.deleteActionIcon]}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.alert}
                  />
                </View>
                <View>
                  <Text style={[styles.sheetActionTitle, styles.deleteActionTitle]}>
                    친구 삭제
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetAction}
                onPress={handleBlock}
              >
                <View style={[styles.sheetActionIcon, styles.blockActionIcon]}>
                  <Ionicons name="ban-outline" size={20} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.sheetActionTitle, styles.blockActionTitle]}>
                    차단
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={closeModal}
              >
                <Text style={styles.sheetCancelText}>취소</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default FriendsScreen;
