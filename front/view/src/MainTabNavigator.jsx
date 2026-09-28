import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import MainFooter, { USES_NATIVE_TAB_BAR } from '../frame/mainFooter';
import { MainTabBarInsetContext } from '../../context/MainTabBarInsetContext';
import BoardTab from './tabs/BoardTab';
import MessageTab from './tabs/MessageTab';
import SchoolTab from './tabs/SchoolTab';
import TimerTab from './tabs/TimerTab';
import MyPageTab from './tabs/MyPageTab';

const Tab = createBottomTabNavigator();

export const MAIN_TAB_KEYS = new Set([
  'board',
  'message',
  'school',
  'timer',
  'mypage',
]);

const overlayTabBarStyle = { position: 'absolute', left: 0, right: 0, bottom: 0 };

function MainTabBar({
  state,
  navigation,
  tabNavigationRef,
  onActiveTabChange,
  onOverlayHeightChange,
}) {
  const activeTab = state.routes[state.index].name;

  useEffect(() => {
    tabNavigationRef.current = navigation;
  }, [navigation, tabNavigationRef]);

  useEffect(() => {
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  const footer = (
    <MainFooter
      activeTab={activeTab}
      onTabPress={(tab) => {
        if (tab !== activeTab) {
          navigation.navigate(tab);
        }
      }}
    />
  );

  if (!USES_NATIVE_TAB_BAR) return footer;

  // 콘텐츠가 탭 바 뒤로 지나가도록 탭 바를 띄운다. 가려지는 만큼은 각 탭이 아래 여백으로 채운다.
  return (
    <View
      style={overlayTabBarStyle}
      onLayout={(e) => onOverlayHeightChange(e.nativeEvent.layout.height)}
    >
      {footer}
    </View>
  );
}

export default function MainTabNavigator({
  stackNavigation,
  route,
  onActiveTabChange,
}) {
  const tabNavigationRef = useRef(null);
  /**
   * 푸시/토스트가 Main 위에 Friends·BoardDetail 등을 올린 뒤,
   * 언포커스된 Main 안에서 탭 navigate 하면 RN이 Main을 다시 포커스해
   * 상세 화면이 바로 가려지는 문제가 있다. → 포커스될 때만 탭 전환.
   */
  const pendingTabRef = useRef(null);
  const isFocused = useIsFocused();
  const [overlayTabBarHeight, setOverlayTabBarHeight] = useState(0);

  useEffect(() => {
    const requestedTab = route?.params?.screen ?? route?.params?.initialTab;
    if (!MAIN_TAB_KEYS.has(requestedTab)) return;

    pendingTabRef.current = requestedTab;
    stackNavigation.setParams({ initialTab: undefined, screen: undefined });

    if (!isFocused) return;

    const tab = pendingTabRef.current;
    pendingTabRef.current = null;
    // 탭 navigator ref 가 같은 틱에 준비되도록 한 프레임 양보
    requestAnimationFrame(() => {
      tabNavigationRef.current?.navigate(tab);
    });
  }, [
    route?.params?.screen,
    route?.params?.initialTab,
    stackNavigation,
    isFocused,
  ]);

  useEffect(() => {
    if (!isFocused) return;
    const tab = pendingTabRef.current;
    if (!tab || !MAIN_TAB_KEYS.has(tab)) return;
    pendingTabRef.current = null;
    tabNavigationRef.current?.navigate(tab);
  }, [isFocused]);

  return (
    <MainTabBarInsetContext.Provider value={overlayTabBarHeight}>
    <Tab.Navigator
      initialRouteName="timer"
      tabBar={(props) => (
        <MainTabBar
          {...props}
          tabNavigationRef={tabNavigationRef}
          onActiveTabChange={onActiveTabChange}
          onOverlayHeightChange={setOverlayTabBarHeight}
        />
      )}
      screenOptions={{
        headerShown: false,
        lazy: true,
        unmountOnBlur: false,
      }}
    >
      <Tab.Screen name="board">
        {() => <BoardTab navigation={stackNavigation} />}
      </Tab.Screen>
      <Tab.Screen name="message">
        {() => <MessageTab navigation={stackNavigation} />}
      </Tab.Screen>
      <Tab.Screen name="school">
        {() => <SchoolTab navigation={stackNavigation} />}
      </Tab.Screen>
      <Tab.Screen name="timer" component={TimerTab} options={{ freezeOnBlur: true }} />
      <Tab.Screen name="mypage">
        {() => <MyPageTab navigation={stackNavigation} />}
      </Tab.Screen>
    </Tab.Navigator>
    </MainTabBarInsetContext.Provider>
  );
}

// Tab Navigator는 flex 영역을 채워야 함
export function MainTabNavigatorContainer(props) {
  return (
    <View style={{ flex: 1 }}>
      <MainTabNavigator {...props} />
    </View>
  );
}
