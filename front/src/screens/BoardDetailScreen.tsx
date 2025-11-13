import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';
import { mockPosts } from '../data/mockPosts';
import { Header } from '../components/common/Header';
import { PostCard } from '../components/PostCard';
import { FloatingButton } from '../components/FloatingButton';
import { BottomTabBar } from '../components/BottomTabBar';

export const BoardDetailScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  const headerLeftIcon = <View style={styles.iconPlaceholder} />;
  const headerRightIcon = <View style={styles.iconPlaceholder} />;

  const tabItems = [
    { id: 'home', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'map', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'mail', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'profile', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'settings', icon: <View style={styles.iconPlaceholder} /> },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backButton}>
          <View style={styles.iconPlaceholder} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>우리학교 게시판</Text>
        <TouchableOpacity style={styles.searchButton}>
          <View style={styles.iconPlaceholder} />
        </TouchableOpacity>
      </View>

      {/* 게시글 목록 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mockPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPress={() => console.log(`Post ${post.id} pressed`)}
          />
        ))}
      </ScrollView>

      {/* 플로팅 버튼 */}
      <FloatingButton onPress={() => console.log('Write post pressed')} />

      {/* 하단 네비게이션 */}
      <BottomTabBar
        tabs={tabItems}
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  searchButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: colors.brand,
    borderRadius: 12,
  },
});