import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { footerStyles } from '../../styles/frame.style';

const { width } = Dimensions.get('window');
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

const MainFooter = ({ activeTab = 'board' }) => {
  const tabs = [
    { id: 'board', name: '게시판', icon: 'home', iconActive: 'home' },
    { id: 'message', name: '메시지', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
    { id: 'school', name: '우리 학교', icon: 'school-outline', iconActive: 'school' },
    { id: 'mypage', name: '마이페이지', icon: 'person-outline', iconActive: 'person' },
  ];

  return (
    <View style={footerStyles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={footerStyles.tabButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={normalize(26)}
              color={isActive ? '#4CAF50' : '#999'}
            />
            <Text style={[footerStyles.tabText, isActive && footerStyles.activeTabText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default MainFooter;