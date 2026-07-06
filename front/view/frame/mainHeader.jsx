import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createHeaderStyles, getNormalize } from '../../styles/frame.style';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../../styles/colors';
import { useNotification } from '../../context/NotificationContext';
import CommuteHeaderIndicator from '../../components/CommuteHeaderIndicator';

const MainHeader = ({ activeTab = 'board', navigation }) => {
  const { width, height } = useWindowDimensions();
  const headerStyles = useMemo(
    () => createHeaderStyles(width, height),
    [width, height],
  );
  const normalize = useMemo(() => getNormalize(width), [width]);

  const { hasUnread } = useNotification();

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
        <CommuteHeaderIndicator />
        <TouchableOpacity
          style={headerStyles.iconButton}
          onPress={() => navigation?.navigate('Search')}
        >
          <Ionicons name="search" size={normalize(22)} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={headerStyles.iconButton}
          onPress={() => navigation?.navigate('Notification')}
        >
          <FontAwesome5
            name="bell"
            size={normalize(22)}
            color={colors.primary}
          />
          {/* 알림센터 목록 기준 미읽음만 벨 점으로 표시 */}
          {hasUnread && <View style={headerStyles.badge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainHeader;
