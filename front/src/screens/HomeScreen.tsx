import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import colors from '../constants/colors';
import { boards } from '../data/boards';
import { Header } from '../components/common/Header';
import { TagButton } from '../components/common/TagButton';
import { BoardCard } from '../components/BoardCard';
import { BottomTabBar } from '../components/BottomTabBar';

const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  // 아이콘을 실제 아이콘 컴포넌트로 교체하세요 (예: react-native-vector-icons)
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
      <Header
        leftIcon={headerLeftIcon}
        rightIcon={headerRightIcon}
        onLeftPress={() => console.log('Left icon pressed')}
        onRightPress={() => console.log('Right icon pressed')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tagContainer}>
          <TagButton label="chat" isActive onPress={() => console.log('Chat pressed')} />
        </View>

        <View style={styles.boardList}>
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onPress={() => console.log(`Board ${board.id} pressed`)}
            />
          ))}
        </View>
      </ScrollView>

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
  content: {
    flex: 1,
  },
  tagContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  boardList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: colors.brand,
    borderRadius: 12,
  },
});

export default HomeScreen