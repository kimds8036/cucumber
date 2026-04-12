import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { createSchoolBoardStyles, getNormalize } from '../../styles/schoolBoard.style';
import { colors, fonts } from '../../styles/colors';
import { api } from '../../utils/api';
import { normalizeTagsFromApi } from '../../utils/normalizePostTags';
import BoardPostCard from '../../components/Boardpostcard';
import { useLocationContext } from '../../context/LocationContext';

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
  const { coords, refreshLocation } = useLocationContext();

  const [schoolPosts, setSchoolPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const layoutPendingRef = useRef(null);
  const layoutGateTimeoutRef = useRef(null);
  const listLayoutEpochRef = useRef(0);

  const handleCardLayoutStable = useCallback((id, epoch) => {
    const p = layoutPendingRef.current;
    if (!p || p.epoch !== epoch || !p.ids.has(String(id))) return;
    p.ids.delete(String(id));
    if (layoutPendingRef.current !== p) return;
    if (p.ids.size === 0) {
      if (layoutGateTimeoutRef.current != null) {
        clearTimeout(layoutGateTimeoutRef.current);
        layoutGateTimeoutRef.current = null;
      }
      layoutPendingRef.current = null;
      if (p.isAppend) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

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

  const fetchSchoolPosts = useCallback(
    async (nextPage = 1, append = false) => {
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
          setSchoolPosts([]);
          if (layoutGateTimeoutRef.current != null) {
            clearTimeout(layoutGateTimeoutRef.current);
            layoutGateTimeoutRef.current = null;
          }
          layoutPendingRef.current = null;
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        const params = {
          boardType: 'school',
          schoolId,
          sort: 'latest',
          page: nextPage,
          limit: 20,
        };
        if (coords) {
          params.viewerLat = coords.latitude;
          params.viewerLng = coords.longitude;
        }
        const postsRes = await api.get('/api/posts', { params });
        const apiPosts = postsRes.data?.data?.posts || [];
        const mapped = apiPosts.map((p) => {
          const thumb =
            typeof p.thumbnail === 'string' && p.thumbnail.trim() ? p.thumbnail.trim() : null;
          const tags = normalizeTagsFromApi(p.tags);
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
            distanceKm:
              typeof p.distanceKm === 'number' && !Number.isNaN(p.distanceKm) ? p.distanceKm : null,
          };
        });
        if (append) {
          setSchoolPosts((prev) => [...prev, ...mapped]);
        } else {
          setSchoolPosts(mapped);
        }
        setHasMore(apiPosts.length > 0);
        setPage(nextPage);

        const clearGateTimer = () => {
          if (layoutGateTimeoutRef.current != null) {
            clearTimeout(layoutGateTimeoutRef.current);
            layoutGateTimeoutRef.current = null;
          }
        };

        if (mapped.length === 0) {
          clearGateTimer();
          layoutPendingRef.current = null;
          if (append) setLoadingMore(false);
          else setLoading(false);
        } else {
          clearGateTimer();
          listLayoutEpochRef.current += 1;
          const epoch = listLayoutEpochRef.current;
          layoutPendingRef.current = {
            epoch,
            ids: new Set(mapped.map((p) => String(p.id))),
            isAppend: append,
          };
          layoutGateTimeoutRef.current = setTimeout(() => {
            layoutGateTimeoutRef.current = null;
            const pend = layoutPendingRef.current;
            if (!pend) return;
            layoutPendingRef.current = null;
            if (pend.isAppend) setLoadingMore(false);
            else setLoading(false);
          }, 900);
        }
      } catch (error) {
        console.error('학교 게시판 목록 로드 실패:', error);
        if (layoutGateTimeoutRef.current != null) {
          clearTimeout(layoutGateTimeoutRef.current);
          layoutGateTimeoutRef.current = null;
        }
        layoutPendingRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [coords],
  );

  useEffect(() => {
    fetchSchoolPosts(1, false);
  }, [fetchSchoolPosts]);

  useEffect(() => {
    if (!__DEV__) return;
    const sample = schoolPosts.slice(0, 8).map((p) => ({
      id: p.id,
      tagsLen: Array.isArray(p.tags) ? p.tags.length : p.tags == null ? 'null' : typeof p.tags,
    }));
    console.log('[SchoolBoardAll:list]', { dataSource: 'serverPosts(API)', total: schoolPosts.length, sample });
  }, [schoolPosts]);

  const handleRefresh = async () => {
    await refreshLocation();
    await fetchSchoolPosts(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || schoolPosts.length === 0) return;
    fetchSchoolPosts(page + 1, true);
  };

  const hideListBehindLoader = loading || loadingMore;

  const renderPostItem = ({ item: post }) => (
    <BoardPostCard
      key={post.id}
      post={post}
      normalize={normalize}
      styles={styles}
      layoutStableEpoch={listLayoutEpochRef.current}
      onLayoutStable={handleCardLayoutStable}
      onPress={() =>
        navigation.navigate('BoardDetail', {
          post: { ...post, author: post.author },
          isMyPost: post.isMyPost ?? false,
        })
      }
    />
  );

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

      {/* 게시글 목록 — 로딩 중에는 목록을 그리되 가려 두고, 게이트 종료 후 한 번에 표시 */}
      <View style={{ flex: 1 }}>
        <FlatList
          style={[styles.postList, hideListBehindLoader && { opacity: 0 }]}
          pointerEvents={hideListBehindLoader ? 'none' : 'auto'}
          data={schoolPosts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPostItem}
          showsVerticalScrollIndicator={false}
          refreshing={loading && !hideListBehindLoader}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  아직 학교 게시판에 글이 없습니다.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore && !hideListBehindLoader ? (
              <View style={styles.loadingMoreContainer}>
                <Text style={styles.loadingMoreText}>
                  더 불러오는 중...
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContentContainer}
        />
        {hideListBehindLoader ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                marginTop: normalize(12),
                fontFamily: fonts.regular,
                color: colors.textSecondary,
                fontSize: normalize(14),
              }}
            >
              {loadingMore ? '더 불러오는 중...' : '불러오는 중...'}
            </Text>
          </View>
        ) : null}
      </View>

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

