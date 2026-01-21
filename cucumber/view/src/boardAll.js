import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { colors, fonts } from '../../styles/colors';
import { createBoardStyles, getNormalize } from '../../styles/board.style';

const BoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);

  const [sortType, setSortType] = useState('latest'); // latest, popular, nearby

  // 임시 게시글 데이터
  const posts = [
    {
      id: 1,
      author: '익명',
      time: '2시간 전',
      location: '24m',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 213,
      comments: 89,
    },
    {
      id: 2,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 0,
      comments: 0,
    },
    {
      id: 3,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 0,
      comments: 0,
    },
    {
      id: 4,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 0,
      comments: 0,
    },
    {
      id: 5,
      author: '익명',
      time: '2시간 전',
      location: '',
      content: '중간고사 D-7 같이 공부하실 분>시험기간인데 혼자 공부하니까 집중이 안 되서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
      likes: 213,
      comments: 89,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <MainHeader activeTab="board" />

      {/* 정렬 버튼 영역 */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortType === 'latest' && styles.sortButtonActive]}
          onPress={() => setSortType('latest')}
        >
          <Text style={[styles.sortButtonText, sortType === 'latest' && styles.sortButtonTextActive]}>
            최신
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortType === 'popular' && styles.sortButtonActive]}
          onPress={() => setSortType('popular')}
        >
          <Text style={[styles.sortButtonText, sortType === 'popular' && styles.sortButtonTextActive]}>
            인기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortType === 'nearby' && styles.sortButtonActive]}
          onPress={() => setSortType('nearby')}
        >
          <Text style={[styles.sortButtonText, sortType === 'nearby' && styles.sortButtonTextActive]}>
            근처
          </Text>
        </TouchableOpacity>
      </View>

      {/* 게시글 목록 */}
      <ScrollView style={styles.postList} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postItem} activeOpacity={0.7}>
            {/* 게시글 헤더 */}
            <View style={styles.postHeader}>
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postDot}>·</Text>
                <Text style={styles.postTime}>{post.time}</Text>
                {post.location ? (
                  <>
                    <Text style={styles.postDot}>·</Text>
                    <Text style={styles.postLocation}>{post.location}</Text>
                  </>
                ) : null}
              </View>
              {/* 햄버거 메뉴 버튼 */}
              <TouchableOpacity style={styles.menuButton}>
                <Entypo name="dots-three-vertical" size={normalize(16)} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 게시글 내용 */}
            <Text style={styles.postContent} numberOfLines={3}>
              {post.content}
            </Text>

            {/* 좋아요, 댓글 수 */}
            <View style={styles.postFooter}>
              <View style={styles.postStats}>
                <Ionicons name="heart-outline" size={normalize(16)} color={colors.textSecondary} />
                <Text style={styles.postStatText}>{post.likes}</Text>
              </View>
              <View style={styles.postStats}>
                <Ionicons name="chatbubble-outline" size={normalize(14)} color={colors.textSecondary} />
                <Text style={styles.postStatText}>{post.comments}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 글쓰기 플로팅 버튼 */}
      <TouchableOpacity style={styles.floatingButton} activeOpacity={0.8}>
        <Ionicons name="add" size={normalize(32)} color={colors.background} />
      </TouchableOpacity>

      {/* 푸터 */}
      <MainFooter activeTab="board" />
    </SafeAreaView>
  );
};

export default BoardAll;
