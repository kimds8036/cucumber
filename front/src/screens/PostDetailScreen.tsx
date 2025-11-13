import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';
import { PostDetail } from '../types';
import { fetchPostDetail, addComment } from '../api/posts';
import { PostDetailHeader } from '../components/PostDetailHeader';
import { PostDetailContent } from '../components/PostDetailContent';
import { PostActions } from '../components/PostActions';
import { CommentCard } from '../components/CommentCard';
import { CommentInput } from '../components/CommentInput';
import { BottomTabBar } from '../components/BottomTabBar';

export const PostDetailScreen: React.FC = () => {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    // 게시글 상세 정보 가져오기
    fetchPostDetail(1).then(setPost);
  }, []);

  const handleCommentSubmit = async (text: string) => {
    await addComment(1, text);
    // TODO: 댓글 추가 후 목록 새로고침
    console.log('댓글 작성:', text);
  };

  const tabItems = [
    { id: 'home', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'map', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'mail', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'profile', icon: <View style={styles.iconPlaceholder} /> },
    { id: 'settings', icon: <View style={styles.iconPlaceholder} /> },
  ];

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <View style={styles.iconPlaceholder} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>우리학교 게시판</Text>
        <TouchableOpacity style={styles.searchButton}>
          <View style={styles.iconPlaceholder} />
        </TouchableOpacity>
      </View>

      {/* 게시글 + 댓글 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PostDetailHeader author={post.author} createdAt={post.createdAt} />
        <PostDetailContent title={post.title} content={post.content} />
        <PostActions
          likes={post.likes}
          comments={post.comments}
          onLikePress={() => console.log('Like pressed')}
          onCommentPress={() => console.log('Comment pressed')}
          onSavePress={() => console.log('Save pressed')}
        />
        
        {/* 댓글 목록 */}
        <View style={styles.commentSection}>
          {post.commentList.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </View>
      </ScrollView>

      {/* 댓글 입력창 */}
      <CommentInput onSubmit={handleCommentSubmit} />

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
  header: {
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
  commentSection: {
    marginTop: 8,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: colors.brand,
    borderRadius: 12,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});