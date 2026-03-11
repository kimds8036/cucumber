import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

const ActivityPage = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('written');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [writtenPosts, setWrittenPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === 'written' ? 0 : 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [writtenRes, likedRes] = await Promise.all([
          api.get('/api/posts/my', { params: { page: 1, limit: 50 } }),
          api.get('/api/posts/liked', { params: { page: 1, limit: 50 } }),
        ]);

        if (!mounted) return;

        const wp = (writtenRes.data?.data?.posts || []).map((p) => ({
          id: p.id,
          title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
          date: formatDate(p.created_at),
          likes: p.like_count,
          comments: p.comment_count,
        }));

        const lp = (likedRes.data?.data?.posts || []).map((p) => ({
          id: p.id,
          title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
          date: formatDate(p.created_at),
          likes: p.like_count,
          comments: p.comment_count,
        }));

        setWrittenPosts(wp);
        setLikedPosts(lp);
      } catch (error) {
        console.error('내 활동 게시글 로드 실패:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const currentPosts = activeTab === 'written' ? writtenPosts : likedPosts;

  const PostItem = ({ post }) => (
    <TouchableOpacity
      style={styles.postItem}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('BoardDetail', {
          post: {
            id: post.id,
            author: '익명',
            time: '',
            location: '',
            content: '',
            likes: post.likes,
            comments: post.comments,
          },
          isMyPost: activeTab === 'written',
        })
      }
    >
      <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
      <View style={styles.postBottom}>
        <Text style={styles.postDate}>{post.date}</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={14} color="#FF8FA3" />
            <Text style={styles.statText}>{post.likes}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={14} color="#8FD397" />
            <Text style={styles.statText}>{post.comments}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="내 활동" onBack={() => navigation.goBack()} />

      {/* ── pill 슬라이더 토글 ── */}
      <View style={styles.toggleWrapper}>
        <View style={styles.toggleTrack}>
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: activeTab === 'liked' ? '#FF6B6B' : '#8FD397',
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '50%'],
                }),
              },
            ]}
          />

          {/* 내가 쓴 글 */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => handleTabChange('written')}
            activeOpacity={1}
          >
            <Ionicons
              name="document-text-outline"
              size={13}
              color={activeTab === 'written' ? '#fff' : '#aaa'}
            />
            <Text style={[styles.toggleText, activeTab === 'written' && styles.toggleTextActive]}>
              내가 쓴 글
            </Text>
            <View style={[styles.cnt, activeTab === 'written' && styles.cntActive]}>
              <Text style={[styles.cntText, activeTab === 'written' && styles.cntTextActive]}>
                {writtenPosts.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 좋아요 누른 글 */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => handleTabChange('liked')}
            activeOpacity={1}
          >
            <Ionicons
              name="heart-outline"
              size={13}
              color={activeTab === 'liked' ? '#fff' : '#aaa'}
            />
            <Text style={[styles.toggleText, activeTab === 'liked' && styles.toggleTextActive]}>
              좋아요 누른 글
            </Text>
            <View style={[styles.cnt, activeTab === 'liked' && styles.cntActive]}>
              <Text style={[styles.cntText, activeTab === 'liked' && styles.cntTextActive]}>
                {likedPosts.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 게시글 목록 ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && currentPosts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>게시글을 불러오는 중입니다...</Text>
          </View>
        ) : currentPosts.length > 0 ? (
          <View style={styles.list}>
            {currentPosts.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name={activeTab === 'written' ? 'document-text-outline' : 'heart-outline'}
              size={48}
              color="#ddd"
            />
            <Text style={styles.emptyText}>
              {activeTab === 'written' ? '아직 작성한 글이 없어요' : '아직 좋아요 누른 글이 없어요'}
            </Text>
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ── 토글 ──
  toggleWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 0,
    position: 'relative',
    height: 38,
    borderWidth: 1,
    borderColor: '#eee',
  },
  pill: {
    position: 'absolute',
    width: '50%',
    top: 0,
    bottom: 0,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
  },
  toggleTextActive: {
    color: '#fff',
  },
  cnt: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 0,
  },
  cntActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cntText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#aaa',
  },
  cntTextActive: {
    color: '#fff',
  },

  // ── 목록 ──
  scroll: {
    flex: 1,
  },
  list: {
    marginHorizontal: 16,
    gap: 10,
  },
  postItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  postTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: 10,
  },
  postBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postDate: {
    fontSize: 12,
    color: '#bbb',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#999',
  },

  // ── 빈 상태 ──
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#ccc',
    fontWeight: '500',
  },
});

export default ActivityPage;