import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const MyPosts = ({ navigation, route }) => {
  const { type } = route.params || {}; // '전체' or '익명'
  
  // 샘플 데이터
  const posts = [
    { id: 1, title: '오늘 점심 뭐 먹을까요?', date: '2024.02.05', likes: 12, comments: 5 },
    { id: 2, title: '시험 범위 정리', date: '2024.02.04', likes: 8, comments: 3 },
    { id: 3, title: '동아리 모집합니다', date: '2024.02.03', likes: 15, comments: 7 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title={`내가 쓴 글${type ? ` (${type})` : ''}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {posts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postItem}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.postInfo}>
              <Text style={styles.postDate}>{post.date}</Text>
              <View style={styles.postStats}>
                <Ionicons name="heart-outline" size={16} color="#999" />
                <Text style={styles.statText}>{post.likes}</Text>
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color="#999"
                  style={{ marginLeft: 12 }}
                />
                <Text style={styles.statText}>{post.comments}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    
  },
  scrollView: {
    flex: 1,
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postDate: {
    fontSize: 13,
    color: '#999',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
  },
});

export default MyPosts;