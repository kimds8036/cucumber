import React, { useCallback, useEffect } from 'react';
import { BoardAllContent } from '../boardAll';
import { useFocusEffect } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';

const BoardTab = ({ navigation }) => {
  const { setHeaderTitle } = useMainShell();

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.board);
    }, [setHeaderTitle]),
  );

  return <BoardAllContent navigation={navigation} />;
};

export default BoardTab;
