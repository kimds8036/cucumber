import React, { useMemo } from 'react';
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { NativeTabBarView } from 'youth-paper-tab-bar';
import { Ionicons } from '@expo/vector-icons';
import { createFooterStyles, getNormalize } from '../../styles/frame.style';
import Octicons from '@expo/vector-icons/Octicons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSchool } from '@fortawesome/free-solid-svg-icons';
import { colors } from '../../styles/colors';
import LogoIcon from '../../assets/Logo.svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMainShellOptional } from '../../context/MainShellContext';
import MainFooterIOS from './MainFooterIOS';

export const MainFooterLegacy = ({ activeTab: activeTabProp, onTabPress: onTabPressProp }) => {
  const shell = useMainShellOptional();
  const activeTab = activeTabProp ?? shell?.activeTab ?? 'board';
  const onTabPress = onTabPressProp ?? shell?.setActiveTab;
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
          color={activeTab === 'board' ? colors.primary : colors.textLight4}
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
            activeTab === 'message' ? colors.primary : colors.textLight4
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
          color={activeTab === 'school' ? colors.primary : colors.textLight4}
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
          color={activeTab === 'timer' ? colors.primary : colors.textLight4}
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
          color={activeTab === 'mypage' ? colors.primary : colors.textLight4}
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

/** true면 탭 바가 하단 safe area까지 직접 채운다. 감싸는 SafeAreaView는 bottom edge를 빼야 한다. */
export const USES_NATIVE_TAB_BAR = Platform.OS === 'ios' && !!NativeTabBarView;

/** 메인 푸터를 하단에 둔 화면의 SafeAreaView edges */
export const MAIN_FOOTER_SAFE_AREA_EDGES = USES_NATIVE_TAB_BAR
  ? ['top']
  : ['top', 'bottom'];

const MainFooter = (props) => {
  if (USES_NATIVE_TAB_BAR) {
    return <MainFooterIOS {...props} />;
  }
  return <MainFooterLegacy {...props} />;
};

export default MainFooter;
