import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createHeaderStyles } from '../../styles/frame.style';
import Fontisto from '@expo/vector-icons/Fontisto';

const MainHeader = ({ title = '전체' }) => {
  const { width, height } = useWindowDimensions();
  const headerStyles = useMemo(() => createHeaderStyles(width, height), [width, height]);

  return (
    <View style={headerStyles.container}>
      {/* 탭 제목 영역 */}
      <View style={headerStyles.tabContainer}>
        <Text style={headerStyles.tabText}>전체 게시판</Text>
      </View>

      {/* 우측 버튼 영역 */}
      <View style={headerStyles.buttonContainer}>
        <TouchableOpacity style={headerStyles.iconButton}>
          <Ionicons name="search" size={24} color="#A6DA95" />
        </TouchableOpacity>
        <TouchableOpacity style={headerStyles.iconButton}>
          <Fontisto name="bell" size={24} color="#A6DA95" />
          <View style={headerStyles.badge} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainHeader;