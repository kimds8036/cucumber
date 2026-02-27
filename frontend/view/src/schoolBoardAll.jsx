import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { createBoardStyles, getNormalize } from '../../styles/board.style';
import { colors } from '../../styles/colors';
import { BoardAllContent } from './boardAll';

const SchoolBoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SubHeader
        title="학교 게시판"
        onBack={() => navigation?.goBack()}
        rightIcon="search"
        onRightPress={() => navigation?.navigate('SearchScreen')}
        rightElement={
          <Ionicons name="search" size={normalize(22)} color={colors.textPrimary} />
        }
      />
      <BoardAllContent navigation={navigation} />
    </SafeAreaView>
  );
};

export default SchoolBoardAll;

