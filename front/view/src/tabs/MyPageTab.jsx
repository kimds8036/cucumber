import React, { useCallback } from 'react';
import MyPage from '../mypage';
import { useFocusEffect } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';

const MyPageTab = ({ navigation }) => {
  const { setHeaderTitle } = useMainShell();

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.mypage);
    }, [setHeaderTitle]),
  );

  return <MyPage navigation={navigation} />;
};

export default MyPageTab;
