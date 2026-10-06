import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabBarView } from 'youth-paper-tab-bar';
import { useMainShellOptional } from '../../context/MainShellContext';
import { colors } from '../../styles/colors';

// 네이티브 탭 순서와 같아야 한다. family는 네이티브가 아는 폰트 이름이다.
const TABS = [
  { key: 'timer', family: 'Ionicons', Icon: Ionicons, inactive: 'time-outline', active: 'time' },
  { key: 'school', family: 'Ionicons', Icon: Ionicons, inactive: 'school-outline', active: 'school' },
  { key: 'board', family: 'Ionicons', Icon: Ionicons, inactive: 'document-text-outline', active: 'document-text' },
  { key: 'message', family: 'Ionicons', Icon: Ionicons, inactive: 'chatbubble-outline', active: 'chatbubble' },
  { key: 'mypage', family: 'Ionicons', Icon: Ionicons, inactive: 'person-outline', active: 'person' },
];

const TAB_KEYS = TABS.map((tab) => tab.key);

const NATIVE_ICONS = TABS.map(({ family, Icon, inactive, active }) => {
  const glyphMap = Icon.getRawGlyphMap();
  return { family, inactive: glyphMap[inactive], active: glyphMap[active] };
});

const INITIAL_HEIGHT = 49;

const MainFooterIOS = ({ activeTab: activeTabProp, onTabPress: onTabPressProp }) => {
  const shell = useMainShellOptional();
  const activeTab = activeTabProp ?? shell?.activeTab ?? 'board';
  const onTabPress = onTabPressProp ?? shell?.setActiveTab;
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  const tabIndex = TAB_KEYS.indexOf(activeTab);
  const selectedIndex = tabIndex >= 0 ? tabIndex : TAB_KEYS.indexOf('board');

  return (
    <NativeTabBarView
      style={{ height }}
      selectedIndex={selectedIndex}
      icons={NATIVE_ICONS}
      activeColor={colors.text}
      inactiveColor={colors.textLight2}
      onTabSelect={({ nativeEvent }) => {
        const tab = TAB_KEYS[nativeEvent.index];
        if (tab) onTabPress?.(tab);
      }}
      onPreferredHeightChange={({ nativeEvent }) => setHeight(nativeEvent.height)}
    />
  );
};

export default MainFooterIOS;
