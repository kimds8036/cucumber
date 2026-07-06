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
import {
  getMainTabTitle,
  useMainShellOptional,
} from '../../context/MainShellContext';

const MainHeader = ({ headerTitle: headerTitleProp, navigation: navigationProp }) => {
  const shell = useMainShellOptional();
  const headerTitle =
    headerTitleProp ??
    shell?.headerTitle ??
    getMainTabTitle(shell?.activeTab ?? 'board');
  const navigation = navigationProp ?? shell?.navigation;
  const { width, height } = useWindowDimensions();
  const headerStyles = useMemo(
    () => createHeaderStyles(width, height),
    [width, height],
  );
  const normalize = useMemo(() => getNormalize(width), [width]);

  const { hasUnread } = useNotification();

  return (
    <View style={headerStyles.container}>
      {/* 탭 제목 영역 */}
      <View style={headerStyles.tabContainer}>
        <Text style={headerStyles.tabText}>{headerTitle}</Text>
      </View>

      {/* 우측 버튼 영역 */}
      <View style={headerStyles.buttonContainer}>
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
