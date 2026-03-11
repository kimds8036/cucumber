import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';

const NotificationScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('all'); // all, post, mail, system
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const pendingReadIdsRef = useRef(new Set());
  const flushTimerRef = useRef(null);
  const isFlushingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const flushPendingReads = async () => {
    const ids = Array.from(pendingReadIdsRef.current);
    if (!ids.length || isFlushingRef.current) return;
    isFlushingRef.current = true;
    pendingReadIdsRef.current = new Set();
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    try {
      await api.post('/api/notifications/read-batch', { ids });
    } catch (error) {
      console.error('알림 배치 읽음 처리 실패:', error);
      // Optimistic UI는 유지. 필요 시 전체 새로고침으로 복구 가능.
    } finally {
      isFlushingRef.current = false;
    }
  };

  const scheduleFlush = () => {
    const count = pendingReadIdsRef.current.size;
    // 2️⃣ 개수 기준: 10개 이상이면 즉시 전송
    if (count >= 10) {
      flushPendingReads();
      return;
    }

    // 그 외에는 300ms 기다렸다가 전송 (여러 개를 한 번에 모으기 위함)
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(async () => {
      flushTimerRef.current = null;
      await flushPendingReads();
    }, 300);
  };

  const mapTypeToIcon = (type, category) => {
    if (category === 'mail') return { name: 'mail', color: '#FFA726', bg: '#FFF3E0' };
    if (category === 'system') return { name: 'megaphone', color: '#9C27B0', bg: '#F3E5F5' };
    switch (type) {
      case 'like':
        return { name: 'heart', color: '#FF6B6B', bg: '#FFE5E5' };
      case 'comment':
      case 'reply':
        return { name: 'chatbubble', color: '#4CAF50', bg: '#E8F5E9' };
      case 'mention':
        return { name: 'at', color: '#2196F3', bg: '#E3F2FD' };
      default:
        return { name: 'notifications-outline', color: '#4CAF50', bg: '#E8F5E9' };
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return d.toLocaleDateString('ko-KR');
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/notifications');
      const list = res.data?.data || [];

      // 좋아요(type === 'like') 알림은 너무 사소하므로 제외
      const filtered = list.filter((n) => n.type !== 'like');

      const mapped = filtered.map((n) => {
        const icon = mapTypeToIcon(n.type, n.category);
        return {
          id: n.id,
          type: n.type,
          category: n.category,
          title: n.title,
          content: n.content,
          time: formatTime(n.createdAt),
           // 원본 시각/타입 정보도 보존 (필요 시 상세 화면에서 사용)
          createdAt: n.createdAt,
          isRead: !!n.isRead,
          icon: icon.name,
          iconColor: icon.color,
          iconBg: icon.bg,
          relatedType: n.relatedType,
          relatedId: n.relatedId,
        };
      });
      setNotifications(mapped);
    } catch (error) {
      console.error('알림 목록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 5️⃣ 앱 종료/백그라운드 대비: 상태 전환 시, 그리고 언마운트 시 pending 읽음 요청 강제 전송
  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/active/) && nextState.match(/inactive|background/)) {
        // 앱이 background/inactive 로 갈 때 남은 읽음 요청을 강제로 flush
        flushPendingReads();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      sub.remove();
      // 화면 떠날 때도 남은 읽음 요청 전송
      flushPendingReads();
    };
  }, []);

  const tabs = useMemo(
    () => [
      { key: 'all', label: '전체', count: notifications.length },
      {
        key: 'post',
        label: '게시글',
        count: notifications.filter((n) => n.category === 'post').length,
      },
      {
        key: 'mail',
        label: '우편함',
        count: notifications.filter((n) => n.category === 'mail').length,
      },
      {
        key: 'system',
        label: '시스템',
        count: notifications.filter((n) => n.category === 'system').length,
      },
    ],
    [notifications],
  );

  const filteredNotifications =
    selectedTab === 'all'
      ? notifications
      : notifications.filter((n) => n.category === selectedTab);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('알림 모두 읽음 처리 실패:', error);
    }
  };

  const handlePressNotification = (n) => {
    // 1️⃣ Optimistic UI: 즉시 빨간 점 제거
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, isRead: true } : item
      )
    );

    // 2️⃣ Batch API 요청을 위해 ID만 큐에 쌓고, 주기적으로 한번에 전송
    pendingReadIdsRef.current.add(n.id);
    scheduleFlush();

    // 3️⃣ 알림 키에 따라 목적지 분기

    // 1) 친구 요청 계열
    if (n.type === 'friend_request') {
      navigation?.navigate('Friends');
      return;
    }

    // 2) 게시글/댓글/대댓글 관련 (댓글 달림, 대댓글 달림, 인기글 등록 등)
    if (n.category === 'post' || n.relatedType === 'post') {
      if (n.relatedId) {
        navigation?.navigate('BoardDetail', {
          post: {
            id: n.relatedId,
            author: '익명',
            time: '',
            location: '',
            content: '',
            likes: 0,
            comments: 0,
          },
          isMyPost: false,
        });
      }
      return;
    }

    // 3) 우편/쪽지 관련
    if (n.category === 'mail' || n.type === 'mail') {
      // (1) 개인 익명 우편 (personal_mail)
      if (n.relatedType === 'personal_mail' && n.relatedId) {
        navigation?.navigate('MailDetail', {
          mail: {
            id: n.relatedId,
            receivedAt: n.time,
            content: n.content,
            is_read: false,
          },
        });
        return;
      }

      // (2) 쪽지 채팅방 (message_room)
      if (n.relatedType === 'message_room' && n.relatedId) {
        navigation?.navigate('Chat', {
          roomId: n.relatedId,
        });
        return;
      }

      // (3) 기본: 메시지/우편 화면 루트로 이동
      navigation?.navigate('Message');
      return;
    }

    // 4) 시스템 알림 (예: 인기 게시글 등록 등)
    if (n.category === 'system') {
      if (n.relatedType === 'post' && n.relatedId) {
        navigation?.navigate('BoardDetail', {
          post: {
            id: n.relatedId,
            author: '익명',
            time: '',
            location: '',
            content: '',
            likes: 0,
            comments: 0,
          },
          isMyPost: false,
        });
        return;
      }

      // 그 외 시스템 알림은 일단 메인으로 이동 (원하면 마이페이지 등으로 변경 가능)
      navigation?.navigate('Main');
      return;
    }

    // 기본: 특별한 분기 없으면 아무 동작 안 함
  };

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SubHeader title="알림" onBack={() => navigation?.goBack()} />

      {/* 탭 메뉴 */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                selectedTab === tab.key && styles.tabButtonActive,
              ]}
              onPress={() => setSelectedTab(tab.key)}>
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.key && styles.tabTextActive,
                ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[
                  styles.countBadge,
                  selectedTab === tab.key && styles.countBadgeActive,
                ]}>
                  <Text style={[
                    styles.countText,
                    selectedTab === tab.key && styles.countTextActive,
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 읽지 않은 알림 헤더 */}
      {unreadCount > 0 && (
        <View style={styles.unreadHeader}>
          <Text style={styles.unreadText}>읽지 않은 알림 {unreadCount}개</Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllReadButton}>모두 읽음으로 표시</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 알림 목록 */}
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={32} color="#CCC" />
            <Text style={styles.emptyText}>알림을 불러오는 중입니다...</Text>
          </View>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && styles.notificationItemUnread,
              ]}
              onPress={() => handlePressNotification(notification)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: notification.iconBg },
                ]}
              >
                <Ionicons
                  name={notification.icon}
                  size={24}
                  color={notification.iconColor}
                />
              </View>

              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationText} numberOfLines={2}>
                  {notification.content}
                </Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>

              {!notification.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>알림이 없습니다</Text>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  unreadHeader: {
    backgroundColor: '#FFF9E6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unreadText: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '500',
  },
  markAllReadButton: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 16,
    marginBottom: 1,
    alignItems: 'flex-start',
  },
  notificationItemUnread: {
    backgroundColor: '#F9FFF9',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default NotificationScreen;