import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import { getNormalize, createBoardStyles } from '../../styles/board.style';
import { createMyPostsStyles } from '../../styles/mypage.style';
import { normalizeTagsFromApi } from '../../utils/normalizePostTags';
import BoardPostCard from '../../components/Boardpostcard';
import Skeleton from '../../components/common/Skeleton';

/** 서버 created_at(UTC)을 "n분 전" 형식으로 (boardAll과 동일) */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr =
    typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) &&
    !/[Z+-]/.test(dateStr)
  ) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function mapServerPostToCard(p, listKind) {
  const isMyPost = listKind === 'written';
  const thumb =
    typeof p.thumbnail === 'string' && p.thumbnail.trim()
      ? p.thumbnail.trim()
      : null;
  const tags = normalizeTagsFromApi(p.tags);
  const school =
    p.school_name != null && String(p.school_name).trim()
      ? String(p.school_name).trim()
      : '';
  return {
    id: p.id,
    author: '익명',
    time: formatTimeAgo(p.created_at),
    location: school,
    content: p.content ?? '',
    likes: p.like_count,
    comments: p.comment_count,
    liked: Boolean(p.isLiked ?? false),
    scrapped: Boolean(p.isScrapped ?? p.is_scrapped ?? listKind === 'scrapped'),
    scrapCount: Number(p.scrapCount ?? 0) || 0,
    isMyPost,
    authorUserId: p.author_user_id,
    thumbnail: thumb,
    tags,
    distanceKm: null,
  };
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
  const boardStyles = useMemo(
    () => createBoardStyles(width, normalize),
    [width, normalize],
  );
  const listKind = tabFromRoute(route);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const layoutEpochRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const kind = tabFromRoute(route);

    const fetchData = async () => {
      try {
        setLoading(true);
        const url =
          kind === 'written' ? '/api/posts/my' : '/api/posts/scrapped';
        const res = await api.get(url, { params: { page: 1, limit: 50 } });

        if (!mounted) return;

        const mapped = (res.data?.data?.posts || []).map((p) =>
          mapServerPostToCard(p, kind),
        );
        setPosts(mapped);
        layoutEpochRef.current += 1;
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
  const layoutEpoch = layoutEpochRef.current;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title={screenTitle} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: width * 0.04, paddingTop: normalize(16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading && posts.length === 0 ? (
          <View>
            {[0, 1, 2, 3].map((idx) => (
              <View key={`skel-${idx}`} style={boardStyles.postItem}>
                <View
                  style={{ flexDirection: 'row', marginBottom: normalize(8) }}
                >
                  <Skeleton
                    width={normalize(52)}
                    height={normalize(12)}
                    borderRadius={normalize(6)}
                  />
                  <View style={{ width: normalize(8) }} />
                  <Skeleton
                    width={normalize(44)}
                    height={normalize(12)}
                    borderRadius={normalize(6)}
                  />
                </View>
                <Skeleton
                  width="100%"
                  height={normalize(14)}
                  borderRadius={normalize(6)}
                  style={{ marginBottom: normalize(6) }}
                />
                <Skeleton
                  width="86%"
                  height={normalize(14)}
                  borderRadius={normalize(6)}
                  style={{ marginBottom: normalize(10) }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: normalize(12),
                  }}
                >
                  <Skeleton
                    width={normalize(26)}
                    height={normalize(12)}
                    borderRadius={normalize(6)}
                  />
                  <Skeleton
                    width={normalize(26)}
                    height={normalize(12)}
                    borderRadius={normalize(6)}
                  />
                  <Skeleton
                    width={normalize(26)}
                    height={normalize(12)}
                    borderRadius={normalize(6)}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : posts.length > 0 ? (
          <View>
            {posts.map((post) => (
              <BoardPostCard
                key={post.id}
                post={post}
                normalize={normalize}
                styles={boardStyles}
                layoutStableEpoch={layoutEpoch}
                hideDistanceBadge
                onPress={() =>
                  navigation.navigate('BoardDetail', {
                    post: { ...post, author: post.author },
                    isMyPost: listKind === 'written',
                  })
                }
              />
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
