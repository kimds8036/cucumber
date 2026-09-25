import React, { useState } from 'react';
import { NativeTabBarView } from 'youth-paper-tab-bar';
import { useMainShellOptional } from '../../context/MainShellContext';

// 네이티브 탭 순서와 같아야 한다.
const TAB_KEYS = ['board', 'message', 'school', 'timer', 'mypage'];
const INITIAL_HEIGHT = 49;

const MainFooterIOS = ({ activeTab: activeTabProp, onTabPress: onTabPressProp }) => {
  const shell = useMainShellOptional();
  const activeTab = activeTabProp ?? shell?.activeTab ?? 'board';
  const onTabPress = onTabPressProp ?? shell?.setActiveTab;
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  const selectedIndex = Math.max(TAB_KEYS.indexOf(activeTab), 0);

  return (
    <NativeTabBarView
      style={{ height }}
      selectedIndex={selectedIndex}
      onTabSelect={({ nativeEvent }) => {
        const tab = TAB_KEYS[nativeEvent.index];
        if (tab) onTabPress?.(tab);
      }}
      onPreferredHeightChange={({ nativeEvent }) => setHeight(nativeEvent.height)}
    />
  );
};

export default MainFooterIOS;
