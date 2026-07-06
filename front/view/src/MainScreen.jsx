import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { BoardAllContent } from './boardAll';
import { MessageContent } from './Message';
import { TimerContent } from './timer';
import { colors } from '../../styles/colors';
import MyPage from './mypage';
import OurSchoolScreen from './ourschoolscreen';
import Skeleton from '../../components/common/Skeleton';
import { trackScreenView } from '../../utils/analytics';
import { MAIN_TAB_TO_ANALYTICS_SCREEN } from '../../constants/analyticsScreens';

const MAIN_TABS = new Set(['board', 'message', 'school', 'timer', 'mypage']);

const MainScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'message' | 'school' | 'timer' | 'mypage'
  const [screenReady, setScreenReady] = useState(false);
  const [lastBackPressedAt, setLastBackPressedAt] = useState(0);

  useEffect(() => {
    const requestedTab = route?.params?.initialTab;
    if (!MAIN_TABS.has(requestedTab)) return;
    setActiveTab(requestedTab);
    navigation.setParams({ initialTab: undefined });
  }, [route?.params?.initialTab, navigation]);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 180);
    return () => clearTimeout(timer);
  }, []);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'board':
        return <BoardAllContent navigation={navigation} />;
      case 'message':
        return <MessageContent navigation={navigation} />;
      case 'school':
        return <OurSchoolScreen navigation={navigation} />;
      case 'timer':
        return <TimerContent />;
      case 'mypage':
        return <MyPage navigation={navigation} />;
      default:
        return <View style={{ flex: 1 }} />;
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      <MainHeader activeTab={activeTab} navigation={navigation} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {screenReady ? (
          renderContent()
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
      <MainFooter
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab)}
      />
    </SafeAreaView>
  );
};

export default MainScreen;
