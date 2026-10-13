import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { initialWindowMetrics } from 'react-native-safe-area-context';
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

// 탭 바가 하단 safe area까지 채우므로 첫 프레임부터 그 높이로 잡아 두고, 실제 높이는 네이티브가 알려 준다.
const ESTIMATED_HEIGHT = 49 + (initialWindowMetrics?.insets?.bottom ?? 0);
let lastNativeHeight = null;

const MainFooterIOS = ({ activeTab: activeTabProp, onTabPress: onTabPressProp }) => {
  const shell = useMainShellOptional();
  const activeTab = activeTabProp ?? shell?.activeTab ?? 'board';
  const onTabPress = onTabPressProp ?? shell?.setActiveTab;
  const [height, setHeight] = useState(lastNativeHeight ?? ESTIMATED_HEIGHT);

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
      onPreferredHeightChange={({ nativeEvent }) => {
        lastNativeHeight = nativeEvent.height;
        setHeight(nativeEvent.height);
      }}
    />
  );
};

export default MainFooterIOS;
