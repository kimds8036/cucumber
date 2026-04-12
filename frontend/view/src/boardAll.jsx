import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Share,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { colors, fonts } from '../../styles/colors';
import { createBoardStyles, getNormalize } from '../../styles/board.style';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
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

// 메인 화면(MainScreen)에서 헤더/푸터 없이 메인 영역만 렌더할 때 사용
// posts: 외부에서 주입하는 게시글 배열 (없으면 defaultPosts 사용)
export function BoardAllContent({ navigation, posts }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);
  const { coords, refreshLocation } = useLocationContext();

  const [sortType, setSortType] = useState('latest'); // latest, popular, nearby
  const [serverPosts, setServerPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [floatingMenuPost, setFloatingMenuPost] = useState(null);

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

  const defaultMenuItemsOthers = useMemo(
    () => [
      { label: '쪽지 보내기', iconName: 'chatbubble-outline' },
      { label: '공유하기', iconName: 'share-outline' },
      { label: '신고하기', iconName: 'flag-outline' },
    ],
    []
  );

  const defaultMenuItemsMine = useMemo(
    () => [
      { label: '공유하기', iconName: 'share-outline', onPress: () => {} },
      {
        label: '삭제하기',
        iconName: 'trash-outline',
        onPress: () => {
          const postToDelete = floatingMenuPost;
          closeFloatingMenu();
          if (!postToDelete) return;
          Alert.alert(
            '게시글 삭제',
            '이 게시글을 삭제할까요?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await api.delete(`/api/posts/${postToDelete.id}`);
                    setServerPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
                    Alert.alert('삭제됨', '게시글이 삭제되었습니다.');
                  } catch (error) {
                    console.error('게시글 삭제 오류:', error);
                    Alert.alert(
                      '오류',
                      error.response?.data?.message || '게시글 삭제 중 오류가 발생했습니다.'
                    );
                  }
                },
              },
            ]
          );
        },
      },
    ],
    [floatingMenuPost]
  );

  const openFloatingMenu = (post, ref) => {
    ref?.measureInWindow((x, y) => {
      setFloatingMenuAnchor({ x, y });
      setFloatingMenuPost(post);
      setFloatingMenuVisible(true);
    });
  };
  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuAnchor(null);
    setFloatingMenuPost(null);
  };
  const startNoteToPostAuthorFromList = async (post) => {
    if (!post?.authorUserId || !post?.id) {
      Alert.alert('오류', '쪽지를 보낼 수 없습니다.');
      return;
    }
    try {
      const res = await api.post('/api/messages/rooms', {
        postId: post.id,
        otherUserId: post.authorUserId,
      });
      const room = res.data?.data;
      if (!room?.id) {
        Alert.alert('오류', '쪽지 방 정보를 불러올 수 없습니다.');
        return;
      }
      closeFloatingMenu();
      navigation.navigate('Chat', { roomId: room.id });
    } catch (error) {
      console.error('쪽지방 생성/조회 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '쪽지방을 여는 중 오류가 발생했습니다.'
      );
    }
  };

  const handleShareFromList = async (post) => {
    if (!post?.id) return;
    const url = `${api.defaults.baseURL}/posts/${post.id}`;
    try {
      await Share.share({
        message: `오늘의 이야기 게시글을 공유합니다.\n\n${url}`,
        url,
        title: '오늘의 이야기 게시글',
      });
    } catch (error) {
      console.error('게시글 공유 실패:', error);
    }
  };

  const fetchPosts = useCallback(
    async (nextPage = 1, append = false) => {
      try {
        if (sortType === 'nearby' && !coords) {
          if (nextPage === 1) {
            setServerPosts([]);
            setHasMore(false);
            setPage(1);
          }
          if (layoutGateTimeoutRef.current != null) {
            clearTimeout(layoutGateTimeoutRef.current);
            layoutGateTimeoutRef.current = null;
          }
          layoutPendingRef.current = null;
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        if (nextPage === 1) {
          setLoading(true);
          setHasMore(true);
        } else {
          setLoadingMore(true);
        }
        const sortParam =
          sortType === 'popular' ? 'popular' : sortType === 'nearby' ? 'nearby' : 'latest';
        const params = {
          boardType: 'national',
          sort: sortParam,
          page: nextPage,
          limit: 20,
        };
        if (coords) {
          params.viewerLat = coords.latitude;
          params.viewerLng = coords.longitude;
        }
        const response = await api.get('/api/posts', { params });
        const apiPosts = response.data?.data?.posts || [];
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
            scrapped: Boolean(p.isScrapped ?? p.is_scrapped ?? false),
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
          setServerPosts((prev) => [...prev, ...mapped]);
        } else {
          setServerPosts(mapped);
        }
        setHasMore(apiPosts.length > 0);
        setPage(nextPage);

        const clearGateTimer = () => {
          if (layoutGateTimeoutRef.current != null) {
            clearTimeout(layoutGateTimeoutRef.current);
            layoutGateTimeoutRef.current = null;
          }
        };

        const injected = Boolean(posts && posts.length > 0);
        if (injected) {
          clearGateTimer();
          layoutPendingRef.current = null;
          if (append) setLoadingMore(false);
          else setLoading(false);
        } else if (mapped.length === 0) {
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
        console.error('게시글 목록 로드 실패:', error);
        if (error.response?.data?.message) {
          console.error('서버 메시지:', error.response.data.message);
        }
        if (error.response?.data?.errorDetail) {
          console.error('서버 오류 상세:', error.response.data.errorDetail);
        }
        Alert.alert('오류', '게시글을 불러오는 중 오류가 발생했습니다.');
        if (layoutGateTimeoutRef.current != null) {
          clearTimeout(layoutGateTimeoutRef.current);
          layoutGateTimeoutRef.current = null;
        }
        layoutPendingRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortType, coords, posts],
  );

  // 게시글 목록 로드 (초기 + 정렬 변경 시 + 위치 갱신 시)
  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  const data = posts && posts.length > 0 ? posts : serverPosts;

  useEffect(() => {
    if (!__DEV__) return;
    const usingInjected = Boolean(posts && posts.length > 0);
    const src = usingInjected ? 'injected_posts(prop)' : 'serverPosts(API)';
    const arr = usingInjected ? posts : serverPosts;
    const sample = arr.slice(0, 8).map((p) => ({
      id: p.id,
      tagsLen: Array.isArray(p.tags) ? p.tags.length : p.tags == null ? 'null' : typeof p.tags,
    }));
    console.log('[BoardAllContent:list]', { dataSource: src, total: arr.length, sample });
  }, [posts, serverPosts]);

  const handleRefresh = async () => {
    await refreshLocation();
    await fetchPosts(1, false);
  };

  const handleLoadMore = () => {
    if (sortType === 'nearby' && !coords) return;
    if (loadingMore || !hasMore || data.length === 0) return;
    fetchPosts(page + 1, true);
  };

  const handleScrapPress = useCallback(async (post) => {
    try {
      const res = await api.post(`/api/posts/${post.id}/scrap`);
      const scrapped = Boolean(res.data?.scrapped);
      setServerPosts((prev) =>
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

  const postsInjected = Boolean(posts && posts.length > 0);
  const hideListBehindLoader = (loading || loadingMore) && !postsInjected;

  const renderPostItem = ({ item: post }) => (
    <BoardPostCard
      key={post.id}
      post={post}
      normalize={normalize}
      styles={styles}
      layoutStableEpoch={listLayoutEpochRef.current}
      onLayoutStable={postsInjected ? undefined : handleCardLayoutStable}
      onPress={() =>
        navigation.navigate('BoardDetail', {
          post: { ...post, author: post.author },
          isMyPost: post.isMyPost ?? false,
        })
      }
      onMenuPress={(p, ref) => openFloatingMenu(p, ref)}
    />
  );

  return (
    <>
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

      {/* 게시글 목록 — 로딩 중에는 목록을 그리되 가려 두고, 게이트 종료 후 한 번에 표시 */}
      <View style={{ flex: 1 }}>
        <FlatList
          style={[styles.postList, hideListBehindLoader && { opacity: 0 }]}
          pointerEvents={hideListBehindLoader ? 'none' : 'auto'}
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPostItem}
          showsVerticalScrollIndicator={false}
          refreshing={loading && !hideListBehindLoader}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                  {sortType === 'nearby' && !coords
                    ? '현재 위치를 불러올 수 없어요. 아래로 당겨 다시 시도해 주세요.'
                    : '아직 게시글이 없습니다.'}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore && !hideListBehindLoader ? (
              <View style={{ paddingVertical: normalize(16), alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                  더 불러오는 중...
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: normalize(80) }}
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
        onPress={() => navigation.navigate('BoardWrite', { from: 'Main' })}
      >
        <FontAwesome5 name="plus" size={normalize(24)} color={colors.background} />
      </TouchableOpacity>

      {/* 플로팅 메뉴 (boardAll 인라인 - boardDetail과 동일한 UI) */}
      <Modal
        visible={floatingMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFloatingMenu}
      >
        <TouchableWithoutFeedback onPress={closeFloatingMenu}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.3)',
              ...(floatingMenuAnchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: normalize(12),
                  minWidth: width * 0.45,
                  maxWidth: width * 0.7,
                  paddingVertical: normalize(4),
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 5,
                  ...(floatingMenuAnchor
                    ? {
                        position: 'absolute',
                        right: width - floatingMenuAnchor.x,
                        top: floatingMenuAnchor.y,
                      }
                    : {}),
                }}
              >
                {((floatingMenuPost?.isMyPost) ? defaultMenuItemsMine : defaultMenuItemsOthers).map((item, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: normalize(10),
                        paddingHorizontal: normalize(14),
                      }}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (item.label === '쪽지 보내기') {
                          startNoteToPostAuthorFromList(floatingMenuPost);
                        } else if (item.label === '공유하기') {
                          handleShareFromList(floatingMenuPost);
                        } else if (item.onPress) {
                          item.onPress();
                        }
                        closeFloatingMenu();
                      }}
                    >
                      <Text
                        style={{
                          fontSize: normalize(13),
                          fontFamily: fonts.regular,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Ionicons
                        name={item.iconName}
                        size={normalize(17)}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {index < ((floatingMenuPost?.isMyPost) ? defaultMenuItemsMine : defaultMenuItemsOthers).length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: colors.textLight10,
                          marginHorizontal: normalize(8),
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

// 단독 게시판 화면 (헤더+푸터 포함, 필요 시 사용)
const BoardAll = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <MainHeader activeTab="board" />
      <BoardAllContent navigation={navigation} />
      <MainFooter
        activeTab="board"
        onTabPress={(tab) => {
          if (tab === 'message') navigation.navigate('Message');
        }}
      />
    </SafeAreaView>
  );
};

export default BoardAll;
