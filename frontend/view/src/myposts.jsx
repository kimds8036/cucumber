import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
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

const tabFromRoute = (route) =>
  route?.params?.tab === 'scrapped' ? 'scrapped' : 'written';

const ActivityPage = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createMyPostsStyles(normalize),
    [normalize],
  );
  const listKind = tabFromRoute(route);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const kind = tabFromRoute(route);

    const fetchData = async () => {
      try {
        setLoading(true);
        const url =
          kind === 'written'
            ? '/api/posts/my'
            : '/api/posts/scrapped';
        const res = await api.get(url, { params: { page: 1, limit: 50 } });

        if (!mounted) return;

        const mapped = (res.data?.data?.posts || []).map((p) => ({
          id: p.id,
          title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
          date: formatDate(p.created_at),
          likes: p.like_count,
          comments: p.comment_count,
          liked: Boolean(p.isLiked ?? false),
          scrapCount: Number(p.scrapCount) || 0,
        }));

        setPosts(mapped);
      } catch (error) {
        console.error('내 활동 게시글 로드 실패:', error);
        if (mounted) setPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [route?.params?.tab]);

  const screenTitle =
    listKind === 'written' ? '내가 쓴 글' : '스크랩한 글';

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
          isMyPost: listKind === 'written',
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
            {listKind === 'scrapped' ? (
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

  const SkeletonItem = ({ index }) => (
    <View
      style={[
        styles.postItem,
        index < 4 && styles.myPostSkeletonItemGap,
      ]}
    >
      <View style={styles.myPostSkeletonTitleLine1} />
      <View style={styles.myPostSkeletonTitleLine2} />
      <View style={styles.postBottom}>
        <View style={styles.myPostSkeletonDate} />
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <View style={styles.myPostSkeletonIcon} />
            <View style={styles.myPostSkeletonCount} />
          </View>
          <View style={styles.statItem}>
            <View style={styles.myPostSkeletonIcon} />
            <View style={styles.myPostSkeletonCount} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title={screenTitle} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && posts.length === 0 ? (
          <View style={styles.list}>
            {[0, 1, 2, 3, 4].map((idx) => (
              <SkeletonItem key={`skeleton-${idx}`} index={idx} />
            ))}
          </View>
        ) : posts.length > 0 ? (
          <View style={styles.list}>
            {posts.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name={
                listKind === 'written'
                  ? 'document-text-outline'
                  : 'bookmark-outline'
              }
              size={normalize(48)}
              color={colors.textLight20}
            />
            <Text style={styles.emptyText}>
              {listKind === 'written'
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
