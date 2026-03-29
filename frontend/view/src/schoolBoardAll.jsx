import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { createSchoolBoardStyles, getNormalize } from '../../styles/schoolBoard.style';
import { colors, fonts } from '../../styles/colors';
import { api } from '../../utils/api';

/** 서버 created_at(UTC)을 "n분 전" 형식으로 변환. 화면에서는 기기 로컬 시간 기준으로 계산 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  // MySQL "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 형태이고
  // 타임존 문자가 없으면 UTC로 간주해 Z(=+00:00) 를 붙인다.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
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

const SchoolBoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolBoardStyles(width, normalize), [width]);

  const [schoolPosts, setSchoolPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const handleScrapPress = useCallback(async (post) => {
    try {
      const res = await api.post(`/api/posts/${post.id}/scrap`);
      const scrapped = Boolean(res.data?.scrapped);
      setSchoolPosts((prev) =>
        prev.map((p) => {
          if (p.id !== post.id) return p;
          const cur = p.scrapCount ?? 0;
          const next = scrapped ? cur + 1 : Math.max(0, cur - 1);
          return { ...p, scrapped, scrapCount: next };
        })
      );
    } catch (error) {
      console.error('스크랩 토글 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '스크랩 처리에 실패했습니다.'
      );
    }
  }, []);

  const fetchSchoolPosts = async (nextPage = 1, append = false) => {
    let mounted = true;
    try {
      if (nextPage === 1) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      const schoolRes = await api.get('/api/schools/me');
      const schoolId = schoolRes.data?.data?.id;
      if (!schoolId) {
        if (mounted) setSchoolPosts([]);
        return;
      }
      const postsRes = await api.get('/api/posts', {
        params: {
          boardType: 'school',
          schoolId,
          sort: 'latest',
          page: nextPage,
          limit: 20,
        },
      });
      if (!mounted) return;
      const apiPosts = postsRes.data?.data?.posts || [];
      const mapped = apiPosts.map((p) => {
        const thumb =
          typeof p.thumbnail === 'string' && p.thumbnail.trim() ? p.thumbnail.trim() : null;
        let tags = [];
        if (Array.isArray(p.tags)) {
          tags = p.tags;
        } else if (p.tags != null && typeof p.tags === 'string' && p.tags.startsWith('[')) {
          try {
            const parsed = JSON.parse(p.tags);
            tags = Array.isArray(parsed) ? parsed : [];
          } catch {
            tags = [];
          }
        }
        return {
          id: p.id,
          author: '익명',
          time: formatTimeAgo(p.created_at),
          location: '',
          content: p.content,
          likes: p.like_count,
          comments: p.comment_count,
          liked: Boolean(p.isLiked ?? false),
          scrapped: Boolean(p.isScrapped ?? false),
          scrapCount: p.scrapCount ?? 0,
          isMyPost: !!p.is_author,
          authorUserId: p.author_user_id,
          thumbnail: thumb,
          tags,
        };
      });
      if (append) {
        setSchoolPosts((prev) => [...prev, ...mapped]);
      } else {
        setSchoolPosts(mapped);
      }
      setHasMore(apiPosts.length > 0);
      setPage(nextPage);
    } catch (error) {
      console.error('학교 게시판 목록 로드 실패:', error);
    } finally {
      if (mounted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchSchoolPosts(1, false);
  }, []);

  const handleRefresh = () => {
    fetchSchoolPosts(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || schoolPosts.length === 0) return;
    fetchSchoolPosts(page + 1, true);
  };

  const renderPostItem = ({ item: post }) => {
    const hasThumb =
      typeof post.thumbnail === 'string' && post.thumbnail.trim().length > 0;
    return (
      <TouchableOpacity
        key={post.id}
        style={styles.postItem}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('BoardDetail', {
            post: { ...post, author: post.author },
            isMyPost: post.isMyPost ?? false,
          })
        }
      >
        <View style={styles.postHeader}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text
              style={[
                styles.postAuthor,
                post.author === '작성자' && {
                  fontFamily: fonts.bold,
                  color: colors.alert,
                },
              ]}
              numberOfLines={1}
            >
              {post.author}
            </Text>
            <Text style={styles.postDot}>•</Text>
            <Text style={styles.postTime} numberOfLines={1}>
              {post.time}
            </Text>
            {post.location ? (
              <View style={[styles.postTimeRow, { flexShrink: 1 }]}>
                <Text style={styles.postTime}>{' · '}</Text>
                <Text
                  style={[styles.postLocationText, { flexShrink: 1, minWidth: 0 }]}
                  numberOfLines={1}
                >
                  {post.location}
                </Text>
              </View>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: normalize(8),
              flexShrink: 0,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: normalize(1),
                backgroundColor: colors.primaryLight30,
                borderRadius: normalize(10),
                paddingHorizontal: normalize(7),
                paddingVertical: normalize(2),
              }}
            >
              <MaterialIcons name="location-on" size={normalize(12)} color={colors.primaryDark} />
              <Text
                style={{
                  fontSize: normalize(11),
                  fontFamily: fonts.regular,
                  color: colors.primaryDark,
                }}
              >
                10km
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: normalize(12),
            padding: normalize(12),
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'column',
              marginRight: hasThumb ? normalize(10) : 0,
            }}
          >
            <Text
              style={[styles.postContent, { marginBottom: normalize(7) }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {post.content}
            </Text>

            {Array.isArray(post.tags) && post.tags.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: normalize(6),
                  marginBottom: normalize(7),
                }}
              >
                {post.tags.map((tag, idx) => {
                  const label =
                    tag != null && typeof tag === 'object'
                      ? String(tag.name ?? '')
                      : String(tag ?? '');
                  if (!label.trim()) return null;
                  return (
                    <View
                      key={tag?.id != null ? `tag-${tag.id}` : `tag-${idx}-${label}`}
                      style={{
                        backgroundColor: colors.primaryLight30,
                        borderRadius: normalize(12),
                        paddingHorizontal: normalize(8),
                        paddingVertical: normalize(2),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: normalize(11),
                          fontFamily: fonts.regular,
                          color: colors.primaryDark,
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.postFooter, { justifyContent: 'flex-start' }]}>
              <View style={styles.postStats}>
                <View style={styles.postStatItem}>
                  <FontAwesome
                    name={post.liked ? 'heart' : 'heart-o'}
                    size={normalize(14)}
                    color={colors.alert}
                  />
                  <Text style={styles.postStatText}>{post.likes}</Text>
                </View>
                <View style={styles.postStatItem}>
                  <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                  <Text style={styles.postStatText}>{post.comments}</Text>
                </View>
                <TouchableOpacity
                  style={styles.postStatItem}
                  onPress={() => handleScrapPress(post)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={post.scrapped ? 'bookmark' : 'bookmark-outline'}
                    size={normalize(14)}
                    color={colors.scrap}
                  />
                  <Text style={styles.postStatText}>{post.scrapCount ?? 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {hasThumb ? (
            <Image
              source={{ uri: post.thumbnail.trim() }}
              style={{
                width: normalize(65),
                height: normalize(65),
                borderRadius: normalize(8),
                backgroundColor: colors.textLight10 ?? '#EEE',
              }}
              resizeMode="cover"
            />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title="학교 게시판"
        onBack={() => navigation?.goBack()}
        rightIcon="search"
        onRightPress={() => navigation?.navigate('SearchScreen')}
        rightElement={
          <Ionicons name="search" size={normalize(22)} color={colors.textPrimary} />
        }
      />

      {/* 게시글 목록 - FlatList + 무한 스크롤 */}
      <FlatList
        style={styles.postList}
        data={schoolPosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPostItem}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                아직 학교 게시판에 글이 없습니다.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: normalize(16), alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                더 불러오는 중...
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: normalize(80) }}
      />

      {/* 글쓰기 플로팅 버튼 */}
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BoardWrite', { boardContext: 'school' })}
      >
        <FontAwesome5 name="plus" size={normalize(24)} color={colors.background} />
      </TouchableOpacity>

    </SafeAreaView>
  );
};

export default SchoolBoardAll;

