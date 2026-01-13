import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { headerStyles } from '../../styles/frame.style';

const { width } = Dimensions.get('window');
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

const MainHeader = ({ title = '전체' }) => {
  return (
    <View style={headerStyles.container}>
      {/* 탭 제목 영역 */}
      <View style={headerStyles.tabContainer}>
        <Text style={headerStyles.tabText}>전체 게시판</Text>
      </View>

      {/* 우측 버튼 영역 */}
      <View style={headerStyles.buttonContainer}>
        <TouchableOpacity style={headerStyles.iconButton}>
          <Ionicons name="search-outline" size={normalize(24)} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={headerStyles.iconButton}>
          <Ionicons name="notifications-outline" size={normalize(24)} color="#4CAF50" />
          <View style={headerStyles.badge} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainHeader;