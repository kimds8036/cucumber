import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createHeaderStyles, getNormalize } from '../../styles/frame.style';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../../styles/colors';
import Octicons from '@expo/vector-icons/Octicons';
import { api } from '../../utils/api';

const MainHeader = ({ activeTab = 'board', navigation }) => {
  const { width, height } = useWindowDimensions();
  const headerStyles = useMemo(() => createHeaderStyles(width, height), [width, height]);
  const normalize = useMemo(() => getNormalize(width), [width]);

  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchHasUnread = async () => {
      try {
        const res = await api.get('/api/notifications');
        const list = res.data?.data || [];
        // 좋아요는 알림 목록에서 제외하고 있으므로 여기서는 단순히 isRead 기준만 본다
        const hasUnread = list.some((n) => !n.isRead);
        if (mounted) setHasUnreadNotification(hasUnread);
      } catch (error) {
        console.error('헤더 알림 상태 조회 실패:', error);
        if (mounted) setHasUnreadNotification(false);
      }
    };

    fetchHasUnread();

    const unsubscribe = navigation?.addListener?.('focus', fetchHasUnread);

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [navigation]);

  // activeTab에 따른 헤더 텍스트
  const getTabTitle = () => {
    switch (activeTab) {
      case 'board':
        return '전체 게시판';
      case 'message':
        return '메시지';
      case 'school':
        return '우리 학교';
      case 'mypage':
        return '마이페이지';
      case 'timer':
        return '타이머';
      default:
        return '전체 게시판';
    }
  };

  return (
    <View style={headerStyles.container}>
      {/* 탭 제목 영역 */}
      <View style={headerStyles.tabContainer}>
        <Text style={headerStyles.tabText}>{getTabTitle()}</Text>
      </View>

      {/* 우측 버튼 영역 */}
      <View style={headerStyles.buttonContainer}>
        <TouchableOpacity
          style={headerStyles.iconButton}
          onPress={() => navigation?.navigate('Search')}
        >
          <Ionicons name="search" size={normalize(24)} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={headerStyles.iconButton}
          onPress={() => navigation?.navigate('Notification')}
        >
          <FontAwesome5 name="bell" size={normalize(24)} color={colors.primary} />
          {hasUnreadNotification && <View style={headerStyles.badge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainHeader;
