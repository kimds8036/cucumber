import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createFooterStyles, getNormalize } from '../../styles/frame.style';
import Octicons from '@expo/vector-icons/Octicons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSchool, faHome, faCommentDots, faUser } from '@fortawesome/free-solid-svg-icons';

const MainFooter = ({ activeTab = 'board' }) => {
  const { width, height } = useWindowDimensions();
  const footerStyles = useMemo(() => createFooterStyles(width, height), [width, height]);
  const normalize = useMemo(() => getNormalize(width), [width]);

  return (
    <View style={footerStyles.container}>
      <TouchableOpacity style={footerStyles.tabButton} activeOpacity={0.7}>
        {activeTab === 'board' && <View style={footerStyles.activeTabIndicator} />}
        <Octicons
          name="home-fill"
          size={normalize(30)}
          color={activeTab === 'board' ? '#A6DA95' : '#272a2681'}
        />
        <Text style={[footerStyles.tabText, activeTab === 'board' && footerStyles.activeTabText]}>
          게시판
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={footerStyles.tabButton} activeOpacity={0.7}>
        {activeTab === 'message' && <View style={footerStyles.activeTabIndicator} />}
        <Ionicons
          name="chatbubble-ellipses"
          size={normalize(33)}
          color={activeTab === 'message' ? '#A6DA95' : '#272a2681'}
        />
        <Text style={[footerStyles.tabText, activeTab === 'message' && footerStyles.activeTabText]}>
          메시지
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={footerStyles.tabButton} activeOpacity={0.7}>
        {activeTab === 'school' && <View style={footerStyles.activeTabIndicator} />}
        <FontAwesomeIcon
          icon={faSchool}
          size={normalize(30)}
          color={activeTab === 'school' ? '#A6DA95' : '#272a2681'}
        />
        <Text style={[footerStyles.tabText, activeTab === 'school' && footerStyles.activeTabText]}>
          우리 학교
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={footerStyles.tabButton} activeOpacity={0.7}>
        {activeTab === 'mypage' && <View style={footerStyles.activeTabIndicator} />}
        <Ionicons
          name="person-outline"
          size={normalize(30)}
          color={activeTab === 'mypage' ? '#4CAF50' : '#999'}
        />
        <Text style={[footerStyles.tabText, activeTab === 'mypage' && footerStyles.activeTabText]}>
          마이페이지
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default MainFooter;