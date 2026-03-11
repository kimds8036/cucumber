import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const LikedPosts = ({ navigation }) => {
  // 샘플 데이터
  const likedPosts = [
    { id: 1, title: '맛있는 식당 추천해주세요', author: '익명', date: '2024.02.05', likes: 25 },
    { id: 2, title: '이번 주말 날씨 어때요?', author: '익명', date: '2024.02.04', likes: 18 },
    { id: 3, title: '공부 방법 공유합니다', author: '익명', date: '2024.02.03', likes: 42 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title="좋아요 누른 글"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {likedPosts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postItem}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.postInfo}>
              <Text style={styles.postAuthor}>{post.author}</Text>
              <Text style={styles.postDate}>{post.date}</Text>
              <View style={styles.likeInfo}>
                <Ionicons name="heart" size={16} color="#ff6b6b" />
                <Text style={styles.likeText}>{post.likes}</Text>
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
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  postDate: {
    fontSize: 13,
    color: '#999',
    flex: 1,
  },
  likeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeText: {
    fontSize: 13,
    color: '#ff6b6b',
    marginLeft: 4,
  },
});

export default LikedPosts;