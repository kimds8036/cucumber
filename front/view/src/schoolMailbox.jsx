import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingButton from '../../components/common/FloatingButton';
import SubHeader from '../frame/subHeader';
import { createBoardStyles, getNormalize } from '../../styles/board.style';
import { createSchoolBoardStyles } from '../../styles/schoolBoard.style';
import Skeleton from '../../components/common/Skeleton';
import BoardPostCard from '../../components/Boardpostcard';
import BoardPostCardSkeleton from '../../components/board/BoardPostCardSkeleton';
import { api } from '../../utils/api';
import { subscribeSchoolMailLike, subscribeSchoolMailDeleted } from '../../utils/listSyncEvents';
import { getSchoolMailFromLabel } from './utils/schoolMailFromLabel';
import AdPlaceholder from '../../src/screens/ad/AdPlaceholder';
import TopAdBanner from '../../components/ads/TopAdBanner';
import { injectAdSlots } from '../../hooks/useAdSlots';
import { AD_PLACEMENTS } from '../../constants/adPlacements';
import { useRequireStudentVerified } from '../../hooks/useRequireStudentVerified';

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
  if (Number.isNaN(date.getTime())) return String(createdAt);
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

/** 우편 → BoardPostCard가 읽는 게시글 모양 */
function mapMailForCard(raw, mailboxSchoolId) {
  return {
    id: raw.id,
    type: 'mail',
    fromLabel: getSchoolMailFromLabel(raw, mailboxSchoolId),
    time: formatTimeAgo(raw.created_at) || String(raw.created_at ?? ''),
    content: raw.content ?? '',
    likes: raw.like_count ?? 0,
    comments: raw.comment_count ?? 0,
    scrapCount: 0,
    liked: raw.is_liked ?? false,
    tags: [],
    thumbnail: null,
  };
}

const SKELETON_ITEMS = [0, 1, 2, 3].map((idx) => ({
  type: 'skeleton',
  id: `school-mailbox-skel-${idx}`,
}));

/**
 * 학교 우편함 목록.
 * - 단독 화면: 헤더 `학교명 우편함`, 배너는 목록과 함께 스크롤
 * - embedded: 학교 게시판(`schoolBoardAll`) 안에서 `listHeader`(배너)와 `stickyHeader`(칩 줄)를 받아 같은 목록에 그린다
 */
const SchoolMailboxScreen = ({
  navigation,
  route,
  embedded = false,
  listHeader = null,
  stickyHeader = null,
}) => {
  const { allowed, Gate } = useRequireStudentVerified(navigation, {
    message: '학교 우편은 학생인증 후 이용할 수 있어요.',
    reason: 'school_mail',
  });
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width]);
  const listStyles = useMemo(
    () => createSchoolBoardStyles(width, normalize),
    [width],
  );

  const schoolName = route?.params?.schoolName ?? 'OO고등학교';
  const schoolId = route?.params?.schoolId ?? null;
  const sourceScreen = route?.params?.sourceScreen ?? null;
  // TODO: /api/ads 연동 후 useAdSlots(AD_PLACEMENTS.FEED_SCHOOL_MAIL)
  const adSlots = [];

  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMails = useCallback(
    async (nextPage = 1, append = false) => {
      if (!schoolId) {
        setMails([]);
        setLoading(false);
        setHasMore(false);
        return;
      }
      try {
        if (nextPage === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        const res = await api.get('/api/mails/school', {
          params: { schoolId, page: nextPage, limit: 20 },
        });
        const data = res.data?.data;
        const list = Array.isArray(data?.mails) ? data.mails : [];
        const pag = data?.pagination;
        const totalPages = pag?.totalPages ?? 1;
        if (append && list.length === 0) {
          setHasMore(false);
          return;
        }
        if (append) {
          setMails((prev) => [...prev, ...list]);
        } else {
          setMails(list);
        }
        setPage(nextPage);
        setHasMore(nextPage < totalPages && list.length > 0);
      } catch (e) {
        console.error(
          '학교 우편 목록 로드 실패:',
          e?.response?.data || e.message,
        );
        if (!append) setMails([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      setMails([]);
      setHasMore(false);
      return;
    }
    fetchMails(1, false);
  }, [schoolId, fetchMails]);

  useEffect(() => {
    const unsub = subscribeSchoolMailLike(({ mailId, liked, likeCount }) => {
      setMails((prev) =>
        prev.map((m) =>
          m.id === mailId
            ? { ...m, is_liked: liked, like_count: likeCount }
            : m,
        ),
      );
    });
    const unsubDelete = subscribeSchoolMailDeleted(({ mailId }) => {
      setMails((prev) => prev.filter((m) => m.id !== mailId));
    });
    return () => {
      unsub();
      unsubDelete();
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || !schoolId) return;
    fetchMails(page + 1, true);
  }, [loading, loadingMore, hasMore, schoolId, page, fetchMails]);

  const handleRefresh = useCallback(() => {
    if (!schoolId) return;
    fetchMails(1, false);
  }, [schoolId, fetchMails]);

  const showSkeleton = loading && mails.length === 0;

  const listData = useMemo(() => {
    if (showSkeleton) return SKELETON_ITEMS;
    const cards = mails.map((raw) => mapMailForCard(raw, schoolId));
    return injectAdSlots(cards, adSlots, {
      placement: AD_PLACEMENTS.FEED_SCHOOL_MAIL,
      adType: 'mailAd',
      idPrefix: 'mail_ad',
      skipFirstIndex: false,
    });
  }, [showSkeleton, mails, schoolId, adSlots]);

  const sections = useMemo(() => [{ data: listData }], [listData]);

  const renderItem = ({ item }) => {
    let body;
    if (item.type === 'skeleton') {
      body = <BoardPostCardSkeleton styles={styles} normalize={normalize} />;
    } else if (item.type === 'mailAd') {
      body = (
        <AdPlaceholder
          normalize={normalize}
          styles={styles}
          adData={item.adData}
        />
      );
    } else {
      body = (
        <BoardPostCard
          post={item}
          normalize={normalize}
          styles={styles}
          authorLabel={item.fromLabel}
          hideDistanceBadge
          onPress={() =>
            navigation?.navigate('SchoolMailDetail', {
              mailId: item.id,
              schoolName,
              schoolId,
            })
          }
        />
      );
    }
    return <View style={listStyles.cardGutter}>{body}</View>;
  };

  const listEmpty = !loading ? (
    <View style={listStyles.emptyContainer}>
      <Text style={listStyles.emptyText}>
        {!schoolId ? '학교 정보가 없습니다.' : '아직 우편이 없습니다'}
      </Text>
    </View>
  ) : null;

  if (!allowed) {
    if (!embedded) return <Gate />;
    return (
      <View style={{ flex: 1 }}>
        {listHeader}
        {stickyHeader}
        <Gate />
      </View>
    );
  }

  const list = (
    <View style={{ flex: 1 }}>
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={stickyHeader ? () => stickyHeader : undefined}
        stickySectionHeadersEnabled={Boolean(stickyHeader)}
        ListHeaderComponent={
          embedded ? listHeader : <TopAdBanner placement="board" />
        }
        refreshing={loading && !showSkeleton}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          listData.length === 0 ? (
            listEmpty
          ) : loadingMore ? (
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
        showsVerticalScrollIndicator={false}
      />

      <FloatingButton
        aboveFooter
        onPress={() =>
          navigation?.navigate('SendSchoolMail', {
            schoolName,
            schoolId,
            sourceScreen,
          })
        }
      />
    </View>
  );

  if (embedded) return list;

  return (
    <SafeAreaView style={listStyles.container} edges={['top']}>
      <SubHeader
        title={`${schoolName} 우편함`}
        onBack={() => navigation?.goBack()}
      />
      {list}
    </SafeAreaView>
  );
};

export default SchoolMailboxScreen;
