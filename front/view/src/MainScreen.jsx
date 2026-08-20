import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MainHeader from '../frame/mainHeader';
import { MainShellProvider } from '../../context/MainShellContext';
import { colors } from '../../styles/colors';
import Skeleton from '../../components/common/Skeleton';
import { trackScreenView } from '../../utils/analytics';
import { MAIN_TAB_TO_ANALYTICS_SCREEN } from '../../constants/analyticsScreens';
import { MainTabNavigatorContainer } from './MainTabNavigator';

const MAIN_TABS = new Set(['board', 'message', 'school', 'timer', 'mypage']);

function hasDeepLinkTab(route) {
  const tab = route?.params?.screen ?? route?.params?.initialTab;
  return MAIN_TABS.has(tab);
}

const MainScreen = ({ navigation, route }) => {
  const deepLinkReady = hasDeepLinkTab(route);
  const [activeTab, setActiveTab] = useState(
    deepLinkReady ? route.params.screen || route.params.initialTab : 'board',
  );
  // 위젯 딥링크가 있으면 탭을 즉시 마운트해 linking state가 board로 덮이지 않게 함
  const [screenReady, setScreenReady] = useState(deepLinkReady);
  const [lastBackPressedAt, setLastBackPressedAt] = useState(0);

  useEffect(() => {
    if (hasDeepLinkTab(route)) {
      setScreenReady(true);
      return undefined;
    }
    if (screenReady) return undefined;
    const timer = setTimeout(() => setScreenReady(true), 180);
    return () => clearTimeout(timer);
  }, [route?.params?.screen, route?.params?.initialTab, screenReady, route]);

  useEffect(() => {
    const screen = MAIN_TAB_TO_ANALYTICS_SCREEN[activeTab];
    if (screen) trackScreenView(screen);
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const now = Date.now();
        if (now - lastBackPressedAt < 2000) {
          BackHandler.exitApp();
          return true;
        }
        setLastBackPressedAt(now);
        ToastAndroid.show(
          '뒤로가기를 한 번 더 누르면 종료됩니다.',
          ToastAndroid.SHORT,
        );
        return true;
      });
      return () => sub.remove();
    }, [lastBackPressedAt]),
  );

  return (
    <MainShellProvider
      navigation={navigation}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top', 'bottom']}
      >
        <MainHeader />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {screenReady ? (
            <MainTabNavigatorContainer
              stackNavigation={navigation}
              route={route}
              onActiveTabChange={setActiveTab}
            />
          ) : (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
              {[0, 1, 2].map((idx) => (
                <View
                  key={`main-skeleton-${idx}`}
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.textLight10,
                    marginBottom: 12,
                  }}
                >
                  <Skeleton
                    width="55%"
                    height={14}
                    borderRadius={7}
                    style={{ marginBottom: 10 }}
                  />
                  <Skeleton
                    width="100%"
                    height={12}
                    borderRadius={6}
                    style={{ marginBottom: 8 }}
                  />
                  <Skeleton width="85%" height={12} borderRadius={6} />
                </View>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </MainShellProvider>
  );
};

export default MainScreen;
