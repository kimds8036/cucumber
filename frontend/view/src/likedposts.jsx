import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/board.style';
function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

const LikedPosts = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchLiked = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/posts/liked', {
          params: { page: 1, limit: 50 },
        });
        if (!mounted) return;
        const posts = (res.data?.data?.posts || []).map((p) => ({
          id: p.id,
          title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
          author: '익명',
          date: formatDate(p.created_at),
        }));
        setLikedPosts(posts);
      } catch (error) {
        console.error('좋아요한 글 목록 로드 실패:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLiked();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="좋아요한 글" onBack={() => navigation.goBack()} />

      <ScrollView
        style={[styles.scrollView, { paddingTop: normalize(8) }]}
      >
        {loading && likedPosts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>게시글을 불러오는 중입니다...</Text>
          </View>
        ) : likedPosts.length > 0 ? (
          likedPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postItem}
              onPress={() =>
                navigation.navigate('BoardDetail', {
                  post: { id: post.id },
                  isMyPost: false,
                })
              }
            >
              <Text style={styles.postTitle}>{post.title}</Text>
              <View style={styles.postInfo}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postDate}>{post.date}</Text>
                <View style={styles.likeInfo}>
                  <FontAwesome name="heart" size={normalize(14)} color={colors.alert} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <FontAwesome name="heart-o" size={48} color="#ddd" />
            <Text style={styles.emptyText}>좋아요한 글이 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  empty: {
    flex: 1,
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

export default LikedPosts;
