import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { BoardAllContent } from './boardAll';
import { MessageContent } from './Message';
import { colors } from '../../styles/colors';

const MainScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'message' | 'school' | 'mypage'

  const renderContent = () => {
    switch (activeTab) {
      case 'board':
        return <BoardAllContent navigation={navigation} />;
      case 'message':
        return <MessageContent navigation={navigation} />;
      case 'school':
      case 'mypage':
      default:
        return <View style={{ flex: 1 }} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <MainHeader activeTab={activeTab} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>{renderContent()}</View>
      <MainFooter activeTab={activeTab} onTabPress={(tab) => setActiveTab(tab)} />
    </SafeAreaView>
  );
};

export default MainScreen;
