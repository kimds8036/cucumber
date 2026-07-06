import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MainHeader from '../frame/mainHeader';
import { MainShellProvider } from '../../context/MainShellContext';
import { colors } from '../../styles/colors';
import Skeleton from '../../components/common/Skeleton';
import { MainTabNavigatorContainer } from './MainTabNavigator';

const MainScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('board');
  const [screenReady, setScreenReady] = useState(false);
  const [lastBackPressedAt, setLastBackPressedAt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 180);
    return () => clearTimeout(timer);
  }, []);

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
