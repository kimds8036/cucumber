import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const NotificationScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('all'); // all, post, mail, system

  const notifications = [
    {
      id: 1,
      type: 'like',
      category: 'post',
      title: '김철수님이 회원님의 게시글을 좋아합니다',
      content: '오늘 급식 메뉴 어땠어요?',
      time: '5분 전',
      isRead: false,
      icon: 'heart',
      iconColor: '#FF6B6B',
      iconBg: '#FFE5E5',
    },
    {
      id: 2,
      type: 'comment',
      category: 'post',
      title: '이영희님이 댓글을 남겼습니다',
      content: '진짜 맛있었어요! 특히 김치찌개가...',
      time: '15분 전',
      isRead: false,
      icon: 'chatbubble',
      iconColor: '#4CAF50',
      iconBg: '#E8F5E9',
    },
    {
      id: 3,
      type: 'mail',
      category: 'mail',
      title: '새로운 익명 우편이 도착했습니다',
      content: '누군가 당신에게 편지를 보냈어요',
      time: '1시간 전',
      isRead: false,
      icon: 'mail',
      iconColor: '#FFA726',
      iconBg: '#FFF3E0',
    },
    {
      id: 4,
      type: 'mention',
      category: 'post',
      title: '박민수님이 회원님을 언급했습니다',
      content: '@홍길동 너도 이거 봤어?',
      time: '2시간 전',
      isRead: true,
      icon: 'at',
      iconColor: '#2196F3',
      iconBg: '#E3F2FD',
    },
    {
      id: 5,
      type: 'system',
      category: 'system',
      title: '학교 공지사항',
      content: '내일 체육대회가 예정되어 있습니다. 체육복을 준비해주세요.',
      time: '3시간 전',
      isRead: true,
      icon: 'megaphone',
      iconColor: '#9C27B0',
      iconBg: '#F3E5F5',
    },
    {
      id: 6,
      type: 'reply',
      category: 'post',
      title: '최지훈님이 회원님의 댓글에 답글을 달았습니다',
      content: '맞아요 저도 그렇게 생각해요!',
      time: '5시간 전',
      isRead: true,
      icon: 'git-branch',
      iconColor: '#00BCD4',
      iconBg: '#E0F7FA',
    },
    {
      id: 7,
      type: 'mail',
      category: 'mail',
      title: '우편함에 새로운 메시지가 있습니다',
      content: '안녕! 오랜만이야',
      time: '1일 전',
      isRead: true,
      icon: 'mail-open',
      iconColor: '#FFA726',
      iconBg: '#FFF3E0',
    },
    {
      id: 8,
      type: 'system',
      category: 'system',
      title: '새로운 이벤트',
      content: '동아리 모집이 시작되었습니다!',
      time: '2일 전',
      isRead: true,
      icon: 'gift',
      iconColor: '#E91E63',
      iconBg: '#FCE4EC',
    },
  ];

  const tabs = [
    { key: 'all', label: '전체', count: notifications.length },
    { key: 'post', label: '게시글', count: notifications.filter(n => n.category === 'post').length },
    { key: 'mail', label: '우편함', count: notifications.filter(n => n.category === 'mail').length },
    { key: 'system', label: '시스템', count: notifications.filter(n => n.category === 'system').length },
  ];

  const filteredNotifications = selectedTab === 'all'
    ? notifications
    : notifications.filter(n => n.category === selectedTab);

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
          <TouchableOpacity>
            <Text style={styles.markAllReadButton}>모두 읽음으로 표시</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 알림 목록 */}
      <ScrollView style={styles.scrollView}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && styles.notificationItemUnread,
              ]}>
              <View style={[styles.iconContainer, { backgroundColor: notification.iconBg }]}>
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