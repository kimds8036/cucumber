import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createFooterStyles } from '../../styles/frame.style';
import { colors } from '../../styles/colors';
import { useMainShellOptional } from '../../context/MainShellContext';

const ICON_SIZE = 30;

const TABS = [
  { key: 'timer', label: '타이머', inactive: 'time-outline', active: 'time' },
  { key: 'school', label: '우리 학교', inactive: 'school-outline', active: 'school' },
  { key: 'board', label: '게시판', inactive: 'document-text-outline', active: 'document-text' },
  { key: 'message', label: '메시지', inactive: 'chatbubble-outline', active: 'chatbubble' },
  { key: 'mypage', label: '마이페이지', inactive: 'person-outline', active: 'person' },
];

export const MainFooterLegacy = ({ activeTab: activeTabProp, onTabPress: onTabPressProp }) => {
  const shell = useMainShellOptional();
  const activeTab = activeTabProp ?? shell?.activeTab ?? 'board';
  const onTabPress = onTabPressProp ?? shell?.setActiveTab;
  const { width, height } = useWindowDimensions();
  const footerStyles = useMemo(
    () => createFooterStyles(width, height),
    [width, height],
  );

  return (
    <View style={footerStyles.container}>
      {TABS.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={footerStyles.tabButton}
            activeOpacity={0.7}
            onPress={() => onTabPress?.(tab.key)}
          >
            <Ionicons
              name={selected ? tab.active : tab.inactive}
              size={ICON_SIZE}
              color={selected ? colors.text : colors.textLight2}
            />
            <Text
              style={[
                footerStyles.tabText,
                selected && footerStyles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
