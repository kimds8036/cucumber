import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainFooter from '../frame/mainFooter';
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

function MainTabBar({ state, navigation, tabNavigationRef, onActiveTabChange }) {
  const activeTab = state.routes[state.index].name;

  useEffect(() => {
    tabNavigationRef.current = navigation;
  }, [navigation, tabNavigationRef]);

  useEffect(() => {
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  return (
    <MainFooter
      activeTab={activeTab}
      onTabPress={(tab) => {
        if (tab !== activeTab) {
          navigation.navigate(tab);
        }
      }}
    />
  );
}

export default function MainTabNavigator({
  stackNavigation,
  route,
  onActiveTabChange,
}) {
  const tabNavigationRef = useRef(null);

  useEffect(() => {
    const requestedTab = route?.params?.screen ?? route?.params?.initialTab;
    if (!MAIN_TAB_KEYS.has(requestedTab)) return;
    tabNavigationRef.current?.navigate(requestedTab);
    stackNavigation.setParams({ initialTab: undefined, screen: undefined });
  }, [route?.params?.screen, route?.params?.initialTab, stackNavigation]);

  return (
    <Tab.Navigator
      initialRouteName="board"
      tabBar={(props) => (
        <MainTabBar
          {...props}
          tabNavigationRef={tabNavigationRef}
          onActiveTabChange={onActiveTabChange}
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
