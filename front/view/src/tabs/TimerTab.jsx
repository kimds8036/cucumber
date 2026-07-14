import React, { useCallback } from 'react';
import { TimerContent } from '../timer';
import { useFocusEffect } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';

const TimerTab = () => {
  const { setHeaderTitle } = useMainShell();

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.timer);
    }, [setHeaderTitle]),
  );

  return <TimerContent />;
};

export default TimerTab;
