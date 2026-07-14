import React, { useCallback } from 'react';
import OurSchoolScreen from '../ourschoolscreen';
import { useFocusEffect } from '@react-navigation/native';
import {
  MAIN_TAB_TITLES,
  useMainShell,
} from '../../../context/MainShellContext';

const SchoolTab = ({ navigation }) => {
  const { setHeaderTitle } = useMainShell();

  useFocusEffect(
    useCallback(() => {
      setHeaderTitle(MAIN_TAB_TITLES.school);
    }, [setHeaderTitle]),
  );

  return <OurSchoolScreen navigation={navigation} />;
};

export default SchoolTab;
