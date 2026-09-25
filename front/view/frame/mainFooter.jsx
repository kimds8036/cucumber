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
import { useMainShellOptional } from '../../context/MainShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MainFooter = ({ activeTab: activeTabProp, onTabPress: onTabPressProp }) => {
  const shell = useMainShellOptional();
  const activeTab = activeTabProp ?? shell?.activeTab ?? 'board';
  const onTabPress = onTabPressProp ?? shell?.setActiveTab;
  const { width, height } = useWindowDimensions();
  const footerStyles = useMemo(
    () => createFooterStyles(width, height),
    [width, height],
  );
  const normalize = useMemo(() => getNormalize(width), [width]);
  const insets = useSafeAreaInsets();

  const iconColor = (key) =>
    activeTab === key ? colors.textPrimary : colors.textSecondary;

  return (
    <View
      pointerEvents="box-none"
      style={[
        footerStyles.wrap,
        footerStyles.wrapFloating,
        { paddingBottom: Math.max(insets.bottom, normalize(8)) },
      ]}
    >
      <View style={footerStyles.container}>
        <TouchableOpacity
          style={footerStyles.tabButton}
          activeOpacity={0.7}
          onPress={() => onTabPress?.('board')}
        >
          <Octicons
            name="home-fill"
            size={normalize(26)}
            color={iconColor('board')}
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
          <LogoIcon
            width={normalize(26)}
            height={normalize(26)}
            color={iconColor('message')}
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
          <FontAwesomeIcon
            icon={faSchool}
            size={normalize(28)}
            color={iconColor('school')}
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
          <MaterialIcons
            name="timer"
            size={normalize(30)}
            color={iconColor('timer')}
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
          <Ionicons
            name="person"
            size={normalize(26)}
            color={iconColor('mypage')}
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
    </View>
  );
};

export default MainFooter;
