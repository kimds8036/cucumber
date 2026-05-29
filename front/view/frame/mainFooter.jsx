import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createFooterStyles, getNormalize } from '../../styles/frame.style';
import Octicons from '@expo/vector-icons/Octicons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSchool } from '@fortawesome/free-solid-svg-icons';
import { colors } from '../../styles/colors';
import LogoIcon from '../../assets/Logo.svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const MainFooter = ({ activeTab = 'board', onTabPress }) => {
  const { width, height } = useWindowDimensions();
  const footerStyles = useMemo(
    () => createFooterStyles(width, height),
    [width, height],
  );
  const normalize = useMemo(() => getNormalize(width), [width]);

  return (
    <View style={footerStyles.container}>
      <TouchableOpacity
        style={footerStyles.tabButton}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('board')}
      >
        {activeTab === 'board' && (
          <View style={footerStyles.activeTabIndicator} />
        )}
        <Octicons
          name="home-fill"
          size={normalize(30)}
          color={activeTab === 'board' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            footerStyles.tabText,
            activeTab === 'board' && footerStyles.activeTabText,
          ]}
        >
          게시판
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={footerStyles.tabButton}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('message')}
      >
        {activeTab === 'message' && (
          <View style={footerStyles.activeTabIndicator} />
        )}
        <LogoIcon
          width={normalize(30)}
          height={normalize(30)}
          color={
            activeTab === 'message' ? colors.primary : colors.textSecondary
          }
        />
        <Text
          style={[
            footerStyles.tabText,
            activeTab === 'message' && footerStyles.activeTabText,
          ]}
        >
          메시지
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={footerStyles.tabButton}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('school')}
      >
        {activeTab === 'school' && (
          <View style={footerStyles.activeTabIndicator} />
        )}
        <FontAwesomeIcon
          icon={faSchool}
          size={normalize(33)}
          color={activeTab === 'school' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            footerStyles.tabText,
            activeTab === 'school' && footerStyles.activeTabText,
          ]}
        >
          우리 학교
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={footerStyles.tabButton}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('timer')}
      >
        {activeTab === 'timer' && (
          <View style={footerStyles.activeTabIndicator} />
        )}
        <MaterialIcons
          name="timer"
          size={normalize(35)}
          color={activeTab === 'timer' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            footerStyles.tabText,
            activeTab === 'timer' && footerStyles.activeTabText,
          ]}
        >
          타이머
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={footerStyles.tabButton}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('mypage')}
      >
        {activeTab === 'mypage' && (
          <View style={footerStyles.activeTabIndicator} />
        )}
        <Ionicons
          name="person"
          size={normalize(30)}
          color={activeTab === 'mypage' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            footerStyles.tabText,
            activeTab === 'mypage' && footerStyles.activeTabText,
          ]}
        >
          마이페이지
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default MainFooter;
