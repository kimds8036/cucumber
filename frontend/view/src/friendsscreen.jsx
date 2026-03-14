import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { useFriend } from '../../context/FriendContext';

// 이니셜 아바타 색상
const AVATAR_COLORS = [
  '#8FD397', '#7EC8E3', '#F4A261', '#E76F51',
  '#A8DADC', '#B5838D', '#6D6875', '#52B788',
];
const getAvatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ── 컴포넌트 ─────────────────────────────────────────
const FriendsScreen = ({ navigation }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null); // 바텀시트 대상
  const [modalVisible, setModalVisible]     = useState(false);
  const { refreshFriendRequestBadge } = useFriend();

  // 화면 포커스 시 친구 요청 뱃지 갱신 (빨간점 해제 반영)
  useFocusEffect(
    React.useCallback(() => {
      refreshFriendRequestBadge?.();
    }, [refreshFriendRequestBadge])
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

        setFriends(
          friendsData.map((f) => ({
            id: f.userId,
            friendshipId: f.friendshipId,
            name: f.name,
            username: f.username,
            school: f.school,
            grade: f.grade,
          }))
        );

        setFriendRequests(
          requestsData.map((r) => ({
            id: r.userId,
            requestId: r.requestId,
            name: r.name,
            username: r.username,
            school: r.school,
            grade: r.grade,
          }))
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
      refreshFriendRequestBadge?.();
    } catch (error) {
      console.error('친구 요청 수락 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '친구 요청 수락 중 오류가 발생했습니다.'
      );
    }
  };

  const handleRejectRequest = async (req) => {
    try {
      await api.post(`/api/friends/requests/${req.requestId}/reject`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
      refreshFriendRequestBadge?.();
    } catch (error) {
      console.error('친구 요청 거절 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '친구 요청 거절 중 오류가 발생했습니다.'
      );
    }
  };

  // 검색 필터
  const filtered = friends.filter((f) =>
    f.name.includes(searchQuery) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.school.includes(searchQuery)
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
              setFriends((prev) => prev.filter((f) => f.id !== selectedFriend.id));
            } catch (error) {
              console.error('친구 삭제 실패:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message || '친구 삭제 중 오류가 발생했습니다.'
              );
            }
          },
        },
      ]
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
              setFriends((prev) => prev.filter((f) => f.id !== selectedFriend.id));
            } catch (error) {
              console.error('사용자 차단 실패:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message || '사용자 차단 중 오류가 발생했습니다.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>친구</Text>
        <View style={styles.headerRight}>
          <Text style={styles.friendCountChip}>{friends.length}명</Text>
        </View>
      </View>

      {/* ── 검색창 ── */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 아이디, 학교 검색"
          placeholderTextColor="#bbb"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 스크롤: 친구 요청 + 친구 목록 (함께 스크롤) ── */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 친구 요청 (검색바 ↔ 친구목록 사이) */}
        {friendRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <View style={styles.requestsHeader}>
              <Text style={styles.requestsTitle}>친구 요청</Text>
              <Text style={styles.requestsCount}>{friendRequests.length}건</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.requestsScroll}
            >
              {friendRequests.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={[styles.reqAvatar, { backgroundColor: getAvatarColor(req.id) }]}>
                    <Text style={styles.reqAvatarText}>{req.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.reqName} numberOfLines={1}>{req.name}</Text>
                  <Text style={styles.reqUsername} numberOfLines={1}>{req.username}</Text>
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
            <Ionicons name="people-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>검색 결과가 없어요</Text>
          </View>
        ) : (
          filtered.map((friend) => (
            <View key={friend.id} style={styles.friendRow}>
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(friend.id) }]}>
                <Text style={styles.avatarText}>{friend.name.charAt(0)}</Text>
              </View>
              <View style={styles.friendInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendUsername}>{friend.username}</Text>
                </View>
                <Text style={styles.friendSchool}>
                  {friend.school} · {friend.grade}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.friendIconBtn}
                onPress={() => openModal(friend)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-remove-outline" size={18} color="#8FD397" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── 바텀시트 모달 ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        {/* 딤 배경 */}
        <TouchableOpacity style={styles.modalOverlay} onPress={closeModal} activeOpacity={1} />

        <View style={styles.bottomSheet}>
          {/* 핸들 */}
          <View style={styles.sheetHandle} />

          {/* 대상 친구 정보 */}
          {selectedFriend && (
            <>
              <View style={styles.sheetFriendInfo}>
                <View style={[styles.sheetAvatar, { backgroundColor: getAvatarColor(selectedFriend.id) }]}>
                  <Text style={styles.sheetAvatarText}>
                    {selectedFriend.name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.sheetName}>{selectedFriend.name}</Text>
                  <Text style={styles.sheetUsername}>{selectedFriend.username}</Text>
                  <Text style={styles.sheetSchool}>
                    {selectedFriend.school} · {selectedFriend.grade}
                  </Text>
                </View>
              </View>

              <View style={styles.sheetDivider} />

              {/* 액션 버튼 */}
              <TouchableOpacity style={styles.sheetAction} onPress={handleDelete}>
                <View style={[styles.sheetActionIcon, { backgroundColor: '#FFF3F3' }]}>
                  <Ionicons name="person-remove-outline" size={20} color="#E05C5C" />
                </View>
                <View>
                  <Text style={[styles.sheetActionTitle, { color: '#E05C5C' }]}>친구 삭제</Text>
                  <Text style={styles.sheetActionSub}>친구 목록에서 제거돼요</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetAction} onPress={handleBlock}>
                <View style={[styles.sheetActionIcon, { backgroundColor: '#F5F5F5' }]}>
                  <Ionicons name="ban-outline" size={20} color="#888" />
                </View>
                <View>
                  <Text style={[styles.sheetActionTitle, { color: '#555' }]}>차단</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetCancelBtn} onPress={closeModal}>
                <Text style={styles.sheetCancelText}>취소</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

// ── 스타일 ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  headerRight: {},
  friendCountChip: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8FD397',
    backgroundColor: '#F0FAF2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  // 친구 요청 (인스타 스타일)
  requestsSection: {
    paddingVertical: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  requestsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  requestsCount: {
    fontSize: 13,
    color: '#8FD397',
    marginLeft: 6,
    fontWeight: '600',
  },
  requestsScroll: {
    paddingHorizontal: 0,
    paddingRight: 24,
  },
  requestCard: {
    width: 120,
    marginRight: 12,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reqAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  reqAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  reqName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  reqUsername: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
  },
  reqButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reqAcceptBtn: {
    flex: 1,
    backgroundColor: '#8FD397',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  reqAcceptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  reqRejectBtn: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  reqRejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },

  // 검색
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },

  // 목록
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    paddingHorizontal: 0,
    paddingTop: 14,
    paddingBottom: 8,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  friendUsername: {
    fontSize: 12,
    color: '#aaa',
  },
  friendSchool: {
    fontSize: 12,
    color: '#999',
  },
  friendIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#8FD397',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 빈 상태
  empty: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#ccc',
  },

  // 모달 오버레이
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // 바텀시트
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetFriendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  sheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  sheetName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  sheetUsername: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 2,
  },
  sheetSchool: {
    fontSize: 12,
    color: '#bbb',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  sheetActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sheetActionSub: {
    fontSize: 12,
    color: '#bbb',
  },
  sheetCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
});

export default FriendsScreen;