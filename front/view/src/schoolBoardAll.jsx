import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useWindowDimensions,
  View,
  Text,
  Alert,
  SectionList,
} from 'react-native';
import FloatingButton from '../../components/common/FloatingButton';
import SubHeader from '../frame/subHeader';
import { createSchoolBoardStyles } from '../../styles/schoolBoard.style';
import { createBoardStyles, getNormalize } from '../../styles/board.style';
import { colors } from '../../styles/colors';
import { api } from '../../utils/api';
import { normalizeTagsFromApi } from '../../utils/normalizePostTags';
import { equippedBadgeFromApiRow } from '../../constants/badges';
import BoardPostCard from '../../components/Boardpostcard';
import BoardPostCardSkeleton from '../../components/board/BoardPostCardSkeleton';
import AdPlaceholder from '../../src/screens/ad/AdPlaceholder';
import TopAdBanner from '../../components/ads/TopAdBanner';
import SortChips from '../../components/common/SortChips';
import SchoolMailboxScreen from './schoolMailbox';
import { useLocationContext } from '../../context/LocationContext';
import Skeleton from '../../components/common/Skeleton';
import { injectAdSlots } from '../../hooks/useAdSlots';
import { AD_PLACEMENTS } from '../../constants/adPlacements';

/** 서버 created_at(UTC)을 "n분 전" 형식으로 변환. 화면에서는 기기 로컬 시간 기준으로 계산 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr =
    typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  // MySQL "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 형태이고
  // 타임존 문자가 없으면 UTC로 간주해 Z(=+00:00) 를 붙인다.
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

const SKELETON_ITEMS = [0, 1, 2, 3].map((idx) => ({
  type: 'skeleton',
  id: `school-list-skel-${idx}`,
}));

const SchoolBoardAll = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);
  const listStyles = useMemo(
    () => createSchoolBoardStyles(width, normalize),
    [width],
  );
  const { coords, refreshLocation, permissionGranted } = useLocationContext();
  const distanceStale = permissionGranted && !coords;
  // TODO: /api/ads 연동 후 useAdSlots(AD_PLACEMENTS.FEED_BOARD)
  const adSlots = [];

  const [section, setSection] = useState(
    route?.params?.section === 'mail' ? 'mail' : 'board',
  );
  const [schoolMeta, setSchoolMeta] = useState({
    id: route?.params?.schoolId ?? null,
    name: route?.params?.schoolName ?? '',
  });
  const [schoolPosts, setSchoolPosts] = useState([]);
  const [sortType] = useState('latest');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const didMountSortEffectRef = useRef(false);

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
        }),
      );
    } catch (error) {
      console.error('스크랩 토글 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '스크랩 처리에 실패했습니다.',
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
        const schoolName = schoolRes.data?.data?.name;
        if (schoolId) {
          setSchoolMeta({ id: schoolId, name: schoolName || '' });
        }
        if (!schoolId) {
          setSchoolPosts([]);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        const params = {
          boardType: 'school',
          schoolId,
          sort: sortType,
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
            typeof p.thumbnail === 'string' && p.thumbnail.trim()
              ? p.thumbnail.trim()
              : null;
          const tags = normalizeTagsFromApi(p.tags);
          return {
            id: p.id,
            author: '익명',
            equippedBadge: equippedBadgeFromApiRow(p),
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
            images: Array.isArray(p.images) ? p.images : [],
            tags,
            distanceKm:
              typeof p.distanceKm === 'number' && !Number.isNaN(p.distanceKm)
                ? p.distanceKm
                : null,
          };
        });
        if (append) {
          setSchoolPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const filtered = mapped.filter((p) => !existingIds.has(p.id));
            return [...prev, ...filtered];
          });
        } else {
          setSchoolPosts(mapped);
        }
        setHasMore(apiPosts.length > 0);
        setPage(nextPage);
        if (append) setLoadingMore(false);
        else setLoading(false);
      } catch (error) {
        console.error('학교 게시판 목록 로드 실패:', error);
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [coords, sortType],
  );

  useEffect(() => {
    fetchSchoolPosts(1, false);
  }, [fetchSchoolPosts]);

  useEffect(() => {
    if (!didMountSortEffectRef.current) {
      didMountSortEffectRef.current = true;
      return;
    }
    fetchSchoolPosts(1, false);
  }, [sortType]);

  const handleRefresh = async () => {
    await refreshLocation();
    await fetchSchoolPosts(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || schoolPosts.length === 0) return;
    fetchSchoolPosts(page + 1, true);
  };

  const showSkeleton = loading && schoolPosts.length === 0;

  const listData = useMemo(() => {
    if (showSkeleton) return SKELETON_ITEMS;
    return injectAdSlots(schoolPosts, adSlots, {
      placement: AD_PLACEMENTS.FEED_BOARD,
      adType: 'ad',
      idPrefix: 'ad',
      skipFirstIndex: true,
      wrapItem: (post) => ({ ...post, type: 'post' }),
    });
  }, [showSkeleton, schoolPosts, adSlots]);

  const sections = useMemo(() => [{ data: listData }], [listData]);

  const renderItem = ({ item }) => {
    let body;
    if (item.type === 'skeleton') {
      body = <BoardPostCardSkeleton styles={styles} normalize={normalize} />;
    } else if (item.type === 'ad') {
      body = (
        <AdPlaceholder
          normalize={normalize}
          styles={styles}
          adData={item.adData}
        />
      );
    } else {
      const postHasKm =
        typeof item.distanceKm === 'number' && !Number.isNaN(item.distanceKm);
      body = (
        <BoardPostCard
          post={item}
          normalize={normalize}
          styles={styles}
          showDistanceBadge={permissionGranted}
          distanceStale={distanceStale}
          distanceLoading={permissionGranted && !postHasKm && distanceStale}
          onPress={() =>
            navigation.navigate('BoardDetail', {
              post: {
                ...item,
                boardType: 'school',
                schoolName: schoolMeta.name,
              },
              isMyPost: item.isMyPost ?? false,
            })
          }
        />
      );
    }
    return <View style={listStyles.cardGutter}>{body}</View>;
  };

  const listHeader = <TopAdBanner placement="board" />;
  const stickyHeader = (
    <View style={{ backgroundColor: colors.white }} collapsable={false}>
      <SortChips
        value={section}
        onChange={setSection}
        options={[
          { value: 'board', label: '게시판' },
          { value: 'mail', label: '우편함' },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView style={listStyles.container} edges={['top']}>
      <SubHeader
        title={section === 'mail' ? '학교 우편함' : '학교 게시판'}
        onBack={() => navigation?.goBack()}
      />

      {section === 'mail' ? (
        <SchoolMailboxScreen
          embedded
          navigation={navigation}
          route={{
            params: {
              schoolId: schoolMeta.id,
              schoolName: schoolMeta.name,
            },
          }}
          listHeader={listHeader}
          stickyHeader={stickyHeader}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <SectionList
            style={{ flex: 1 }}
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={() => stickyHeader}
            stickySectionHeadersEnabled
            ListHeaderComponent={listHeader}
            showsVerticalScrollIndicator={false}
            refreshing={loading && !showSkeleton}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              !loading && listData.length === 0 ? (
                <View style={listStyles.emptyContainer}>
                  <Text style={listStyles.emptyText}>
                    아직 학교 게시판에 글이 없습니다.
                  </Text>
                </View>
              ) : loadingMore && hasMore ? (
                <View style={listStyles.loadingMoreContainer}>
                  <Skeleton
                    width={normalize(16)}
                    height={normalize(16)}
                    borderRadius={normalize(8)}
                  />
                </View>
              ) : null
            }
            contentContainerStyle={listStyles.listContentContainer}
          />
          <FloatingButton
            aboveFooter
            onPress={() =>
              navigation.navigate('BoardWrite', { boardContext: 'school' })
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default SchoolBoardAll;
