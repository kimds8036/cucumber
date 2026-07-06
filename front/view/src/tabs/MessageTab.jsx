import React, { useCallback } from 'react';
import { MessageContent } from '../Message';
import { useFocusEffect } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';

const MessageTab = ({ navigation }) => {
  const { setHeaderTitle } = useMainShell();

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.message);
    }, [setHeaderTitle]),
  );

  return <MessageContent navigation={navigation} />;
};

export default MessageTab;
