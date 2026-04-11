import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import {
  getNormalize,
  createMyPostsStyles,
} from '../../styles/mypage.style';

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
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createMyPostsStyles(normalize),
    [normalize],
  );
  const [activeTab, setActiveTab] = useState('written');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [writtenPosts, setWrittenPosts] = useState([]);
  const [scrappedPosts, setScrappedPosts] = useState([]);
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
        const [writtenRes, scrappedRes] = await Promise.all([
          api.get('/api/posts/my', { params: { page: 1, limit: 50 } }),
          api.get('/api/posts/scrapped', { params: { page: 1, limit: 50 } }),
        ]);

        if (!mounted) return;

        const wp = (writtenRes.data?.data?.posts || []).map((p) => ({
          id: p.id,
          title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
          date: formatDate(p.created_at),
          likes: p.like_count,
          comments: p.comment_count,
          liked: Boolean(p.isLiked ?? false),
          scrapCount: Number(p.scrapCount) || 0,
        }));

        const sp = (scrappedRes.data?.data?.posts || []).map((p) => ({
          id: p.id,
          title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
          date: formatDate(p.created_at),
          likes: p.like_count,
          comments: p.comment_count,
          liked: Boolean(p.isLiked ?? false),
          scrapCount: Number(p.scrapCount) || 0,
        }));

        setWrittenPosts(wp);
        setScrappedPosts(sp);
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

  const currentPosts = activeTab === 'written' ? writtenPosts : scrappedPosts;

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
      <Text style={styles.postTitle} numberOfLines={2}>
        {post.title}
      </Text>
      <View style={styles.postBottom}>
        <Text style={styles.postDate}>{post.date}</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            {activeTab === 'scrapped' ? (
              <Ionicons
                name="bookmark"
                size={normalize(14)}
                color={colors.scrap}
              />
            ) : (
              <FontAwesome
                name={post.liked ? 'heart' : 'heart-o'}
                size={normalize(14)}
                color={colors.alert}
              />
            )}
            <Text style={styles.statText}>{post.likes}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name="chatbubble-outline"
              size={normalize(14)}
              color={colors.primary}
            />
            <Text style={styles.statText}>{post.comments}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="내 활동" onBack={() => navigation.goBack()} />

      <View style={styles.toggleWrapper}>
        <View style={styles.toggleTrack}>
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor:
                  activeTab === 'scrapped' ? colors.scrap : colors.primary,
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '50%'],
                }),
              },
            ]}
          />

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => handleTabChange('written')}
            activeOpacity={1}
          >
            <Ionicons
              name="document-text-outline"
              size={normalize(15)}
              color={
                activeTab === 'written' ? colors.textWhite : colors.textLight40
              }
            />
            <Text
              style={[
                styles.toggleText,
                activeTab === 'written' && styles.toggleTextActive,
              ]}
            >
              내가 쓴 글
            </Text>
            <View
              style={[
                styles.cnt,
                activeTab === 'written' && styles.cntActive,
              ]}
            >
              <Text
                style={[
                  styles.cntText,
                  activeTab === 'written' && styles.cntTextActive,
                ]}
              >
                {writtenPosts.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => handleTabChange('scrapped')}
            activeOpacity={1}
          >
            <Ionicons
              name="bookmark-outline"
              size={normalize(13)}
              color={
                activeTab === 'scrapped' ? colors.textWhite : colors.textLight40
              }
            />
            <Text
              style={[
                styles.toggleText,
                activeTab === 'scrapped' && styles.toggleTextActive,
              ]}
            >
              스크랩한 글
            </Text>
            <View
              style={[
                styles.cnt,
                activeTab === 'scrapped' && styles.cntActive,
              ]}
            >
              <Text
                style={[
                  styles.cntText,
                  activeTab === 'scrapped' && styles.cntTextActive,
                ]}
              >
                {scrappedPosts.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && currentPosts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="time-outline"
              size={normalize(40)}
              color={colors.textLight20}
            />
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
              name={
                activeTab === 'written'
                  ? 'document-text-outline'
                  : 'bookmark-outline'
              }
              size={normalize(48)}
              color={colors.textLight20}
            />
            <Text style={styles.emptyText}>
              {activeTab === 'written'
                ? '아직 작성한 글이 없어요'
                : '스크랩한 글이 없습니다'}
            </Text>
          </View>
        )}
        <View style={styles.scrollBottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityPage;
