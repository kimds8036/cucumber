/**
 * timer.jsx — 스택 화면 래퍼 (헤더/푸터 + TimerContent)
 * 본문 로직은 timer/TimerContent.jsx
 */
import React, { useCallback, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { getMainTabTitle } from '../../context/MainShellContext';
import { createTimerStyles, getNormalize } from '../../styles/timer';
import TimerContent from './timer/TimerContent';

export { default as TimerContent } from './timer/TimerContent';

const Timer = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createTimerStyles(width, normalize),
    [width, normalize],
  );
  const goMainTab = useCallback(
    (tab) => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: tab } }],
        }),
      );
    },
    [navigation],
  );
  return (
    <SafeAreaView style={styles.safeAreaFlex} edges={['top', 'bottom']}>
      <View>
        <MainHeader
          headerTitle={getMainTabTitle('timer')}
          navigation={navigation}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TimerContent />
      </View>
      <View>
        <MainFooter
          activeTab="timer"
          onTabPress={(tab) => {
            if (tab === 'board') goMainTab('board');
            if (tab === 'message') goMainTab('message');
            if (tab === 'school') goMainTab('school');
            if (tab === 'mypage') goMainTab('mypage');
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default Timer;
