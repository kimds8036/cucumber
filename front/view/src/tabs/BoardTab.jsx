import React, { useCallback } from 'react';
import { BoardAllContent } from '../boardAll';
import { useFocusEffect } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';
import { reportLastSeen } from '../../../utils/appPresence';

const BoardTab = ({ navigation }) => {
  const { setHeaderTitle } = useMainShell();

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.board);
      void reportLastSeen();
    }, [setHeaderTitle]),
  );

  return <BoardAllContent navigation={navigation} />;
};

export default BoardTab;
