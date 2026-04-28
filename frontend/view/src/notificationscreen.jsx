import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import {
  createNotificationSkeletonStyles,
  createNotificationStyles,
} from '../../styles/notification.style';
import { useNotification } from '../../context/NotificationContext';
import { useFriend } from '../../context/FriendContext';
import ProfileIcon from '../../assets/Profile.svg';
import { getProfileInnerColor } from '../../utils/profileIconColor';
import {
  isStudySummaryNotification,
  normalizeStudySummaryWatchers,
} from '../../utils/studySummaryNotification';

const PAGE_SIZE = 20;
const INITIAL_PREFETCH_PAGES = 3;
/** 초기 로드 시 '좋아요'만 있는 연속 페이지를 건너뛸 때 상한 */
const MAX_INITIAL_PAGE_SWEEP = 30;
/** 초기 진입 시 최소 확보할 표시 알림 수 (필터 적용 후 기준) */
const MIN_INITIAL_VISIBLE_COUNT = 20;
const SHOW_LAYOUT_BORDERS = false;

const popToMainRoot = (navigation) => {
  navigation?.dispatch?.(StackActions.popToTop());
};

const mapTypeToIcon = (type, category) => {
  if (category === 'mail') return { name: 'mail', color: colors.scrap, bg: colors.blue };
  if (category === 'system') return { name: 'notifications', color: colors.alert, bg: colors.red };
  switch (type) {
    case 'like':
      return { name: 'heart', color: colors.alert, bg: colors.red };
    case 'comment':
    case 'reply':
      return { name: 'chatbubble', color: colors.primary, bg: colors.lightgreen };
    case 'mention':
      return { name: 'at', color: colors.subcolor, bg: colors.blue };
    default:
      return { name: 'notifications', color: colors.scrap, bg: colors.yellow };
  }
};

const formatTime = (createdAt) => {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString('ko-KR');
};

/** 알림 내역·탭·벨 집계에서 제외: 쪽지방·DM은 채팅 화면에서만 다룸 */
const isChatNotificationRow = (n) =>
  n?.relatedType === 'message_room' || n?.relatedType === 'dm_room';

const DM_ICON_COLOR_COUNT = 4;

const normalizeWatchers = (watchers) => normalizeStudySummaryWatchers(watchers);

const normalizeKoreanHonorificSpacing = (text) => {
  const raw = String(text ?? '');
  if (!raw) return raw;
  return raw
    .replace(/([^\s])님이/g, '$1 님이')
    .replace(/([^\s])님 외/g, '$1 님 외');
};

const mapRowToNotificationItem = (n) => {
  const icon = mapTypeToIcon(n.type, n.category);
  return {
    id: n.id,
    type: n.type,
    category: n.category,
    title: normalizeKoreanHonorificSpacing(n.title),
    content: normalizeKoreanHonorificSpacing(n.content),
    time: formatTime(n.createdAt),
    createdAt: n.createdAt,
    isRead: !!n.isRead,
    icon: icon.name,
    iconColor: icon.color,
    iconBg: icon.bg,
    relatedType: n.relatedType,
    relatedId: n.relatedId,
    watchers: normalizeWatchers(n.watchers),
  };
};

const sortNotificationsByCreatedDesc = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

// 스켈레톤 행 (로딩 중 리스트 모양)
const SkeletonRow = ({ skeletonStyles }) => {
  return (
    <View style={skeletonStyles.row}>
      <View style={skeletonStyles.icon} />
      <View style={skeletonStyles.content}>
        <View style={[skeletonStyles.line, skeletonStyles.titleLine]} />
        <View style={[skeletonStyles.line, skeletonStyles.textLine]} />
        <View style={[skeletonStyles.line, skeletonStyles.timeLine]} />
      </View>
    </View>
  );
};

const NotificationScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createNotificationStyles(normalize), [normalize]);
  const skeletonStyles = useMemo(
    () => createNotificationSkeletonStyles(normalize),
    [normalize],
  );
  const [selectedTab, setSelectedTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [tappedIds, setTappedIds] = useState({}); // 실제로 눌러서 확인한 알림 ID (여기만 배경색 제거)
  const [expandedSummaryById, setExpandedSummaryById] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tabHydrating, setTabHydrating] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isRefreshingRef = useRef(false);
  const isResetFetchingRef = useRef(false);
  const isAppendFetchingRef = useRef(false);
  const fetchSeqRef = useRef(0);
  const latestAppliedSeqRef = useRef(0);
  const endReachedLockRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const didRunInitialFocusSyncRef = useRef(false);
  /** 알림에서 상세 등으로 push 후 복귀 시 목록·페이지 유지 (벨/뒤로가기로 빠졌다 다시 오면 false) */
  const preserveListOnNextFocusRef = useRef(false);
  const pendingReadIdsRef = useRef(new Set());
  const flushTimerRef = useRef(null);
  const isFlushingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const { hasUnread, markNotificationsSeenForBell, getStudySummaryWatchers } = useNotification();
  const { markFriendRequestsSeenForBell } = useFriend();
  const getDebugBorderStyle = useCallback(
    (color = '#FF3B30') =>
      SHOW_LAYOUT_BORDERS
        ? { borderWidth: 1, borderColor: color }
        : null,
    [],
  );

  const flushPendingReads = useCallback(async () => {
    const ids = Array.from(pendingReadIdsRef.current);
    if (!ids.length || isFlushingRef.current) return;
    isFlushingRef.current = true;
    pendingReadIdsRef.current = new Set();
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    try {
      await api.post('/api/notifications/read-batch', { ids });
    } catch (error) {
      console.error('알림 배치 읽음 처리 실패:', error);
      // Optimistic UI는 유지. 필요 시 전체 새로고침으로 복구 가능.
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  const applyOptimisticReadState = useCallback(
    (items) =>
      items.map((item) => {
        const idKey = String(item.id);
        const tapped = Boolean(tappedIds[item.id] || tappedIds[idKey]);
        const pending = pendingReadIdsRef.current.has(item.id) || pendingReadIdsRef.current.has(idKey);
        if (!tapped && !pending) return item;
        return { ...item, isRead: true };
      }),
    [tappedIds],
  );

  const scheduleFlush = () => {
    const count = pendingReadIdsRef.current.size;
    // 2️⃣ 개수 기준: 10개 이상이면 즉시 전송
    if (count >= 10) {
      flushPendingReads();
      return;
    }

    // 그 외에는 300ms 기다렸다가 전송 (여러 개를 한 번에 모으기 위함)
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(async () => {
      flushTimerRef.current = null;
      await flushPendingReads();
    }, 300);
  };

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        })),
      );
      setTappedIds({});
      markNotificationsSeenForBell?.();
      markFriendRequestsSeenForBell?.();
    } catch (error) {
      console.error('알림 모두 읽음 처리 실패:', error?.response?.data || error);
    }
  }, [markNotificationsSeenForBell, markFriendRequestsSeenForBell]);

  const fetchNotifications = useCallback(async (nextPage = 1, append = false) => {
    // reset / append 동시 실행 방지
    if (append) {
      if (
        isAppendFetchingRef.current ||
        isResetFetchingRef.current ||
        !hasMoreRef.current
      ) return;
      isAppendFetchingRef.current = true;
      setLoadingMore(true);
    } else {
      if (isResetFetchingRef.current || isAppendFetchingRef.current || isRefreshingRef.current) return;
      isResetFetchingRef.current = true;
      isRefreshingRef.current = true;
      setLoading(true);
      setHasMore(true);
    }

    const seq = ++fetchSeqRef.current;

    try {
      console.log('[NotificationScreen] fetchNotifications 호출', {
        page: nextPage,
        append,
        seq,
      });

      if (append) {
        const res = await api.get('/api/notifications', {
          params: { page: nextPage, limit: PAGE_SIZE },
        });
        const list = res.data?.data || [];
        const meta = res.data?.meta;
        const filtered = list
          .filter((n) => n.type !== 'like')
          .filter((n) => !isChatNotificationRow(n));
        const mapped = applyOptimisticReadState(filtered.map(mapRowToNotificationItem));

        // reset 요청이 더 최신이면 append 결과를 버림
        if (latestAppliedSeqRef.current > seq) return;
        setNotifications((prev) => {
          const ids = new Set(prev.map((x) => String(x.id)));
          const addition = mapped.filter((m) => !ids.has(String(m.id)));
          console.log('[NotificationScreen] 알림 추가 로드', {
            page: nextPage,
            serverReturned: list.length,
            afterLikeFilter: filtered.length,
            appendedUnique: addition.length,
            meta,
          });
          return [...prev, ...addition];
        });
        if (latestAppliedSeqRef.current <= seq) {
          latestAppliedSeqRef.current = seq;
          setHasMore(list.length >= PAGE_SIZE);
          setPage(nextPage);
        }
      } else {
        let pageCursor = nextPage;
        let accumulated = [];
        let lastList = [];
        let lastMeta = null;
        let sweepIdx = 0;
        let prefetchCount = 0;

        for (; sweepIdx < MAX_INITIAL_PAGE_SWEEP; sweepIdx += 1) {
          const res = await api.get('/api/notifications', {
            params: { page: pageCursor, limit: PAGE_SIZE },
          });
          lastList = res.data?.data || [];
          lastMeta = res.data?.meta ?? null;
          const filtered = lastList
            .filter((n) => n.type !== 'like')
            .filter((n) => !isChatNotificationRow(n));
          const mapped = applyOptimisticReadState(filtered.map(mapRowToNotificationItem));
          accumulated.push(...mapped);

          console.log('[NotificationScreen] 알림 초기 스윕', {
            page: pageCursor,
            sweep: sweepIdx,
            rawCount: lastList.length,
            afterLikeFilter: filtered.length,
            serverTotal: lastMeta?.total,
            meta: lastMeta,
          });

          // 서버 페이지가 끝났으면 종료
          if (lastList.length < PAGE_SIZE) break;
          prefetchCount += 1;
          // 초기 진입에서는 최소 3페이지까지 넉넉히 로드해 탭 빨간점 깜빡임을 줄인다.
          if (prefetchCount >= INITIAL_PREFETCH_PAGES) break;
          // 필터 후 표시 가능한 알림이 충분히 쌓였으면 종료
          if (accumulated.length >= MIN_INITIAL_VISIBLE_COUNT) break;
          pageCursor += 1;
        }

        const hitSweepCap =
          sweepIdx >= MAX_INITIAL_PAGE_SWEEP &&
          accumulated.length === 0 &&
          lastList.length >= PAGE_SIZE;

        // 최신 reset 결과만 반영
        if (seq >= latestAppliedSeqRef.current) {
          latestAppliedSeqRef.current = seq;
          setNotifications(accumulated);
          setHasMore(lastList.length >= PAGE_SIZE && !hitSweepCap);
          setPage(pageCursor);
          markNotificationsSeenForBell?.();
        }

        console.log('[NotificationScreen] 알림 초기 로드 완료', {
          endPage: pageCursor,
          listRowCount: accumulated.length,
          chatRowsHidden: true,
          serverTotal: lastMeta?.total,
          likeRowsHidden: true,
          hitSweepCap,
        });
      }
    } catch (error) {
      console.error('[NotificationScreen] 알림 목록 불러오기 실패:', error?.response?.data || error);
    } finally {
      if (!append) {
        isRefreshingRef.current = false;
        isResetFetchingRef.current = false;
        setLoading(false);
      } else {
        isAppendFetchingRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [markNotificationsSeenForBell, applyOptimisticReadState]);

  const handleRefresh = useCallback(async () => {
    if (isPullRefreshing || loading || loadingMore) return;
    setIsPullRefreshing(true);
    if (selectedTab !== 'all') setTabHydrating(true);
    try {
      await fetchNotifications(1, false);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [isPullRefreshing, loading, loadingMore, fetchNotifications, selectedTab]);

  // 화면이 최초로 열릴 때 한 번, 소켓 경로 디버그용 ping을 날려본다.
  // - 이 호출 시 서버 로그에 [POST /api/notifications/debug/socket-ping] 이 찍히고
  // - 클라이언트 콘솔에는 [NotificationContext] notification event: debug ... 가 찍혀야 소켓 경로 정상
  // 개발용 소켓 경로 테스트 API는 제거 (불필요한 빨간 점 깜빡임 방지)

  useEffect(() => {
    const onFocus = () => {
      // 화면에 진입한 순간 "알림 목록은 한 번 확인했다"고 간주하고
      // 헤더 벨 빨간 점은 즉시 제거 (일반 알림 + 친구 요청 알림 모두)
      markNotificationsSeenForBell?.();
      markFriendRequestsSeenForBell?.();
      if (preserveListOnNextFocusRef.current) {
        preserveListOnNextFocusRef.current = false;
        return;
      }
      if (selectedTab !== 'all') setTabHydrating(true);
      fetchNotifications(1, false);
    };

    const onBlur = () => {
      // 화면에서 나갈 때, 현재까지 눌러서 확인한 알림들만 서버에 반영
      flushPendingReads();
      try {
        const state = navigation?.getState?.();
        if (!state?.routes?.length) {
          preserveListOnNextFocusRef.current = false;
          return;
        }
        const topIdx = state.index;
        const notifIdx = state.routes.findIndex((r) => r.name === 'Notification');
        if (notifIdx === -1) {
          preserveListOnNextFocusRef.current = false;
          return;
        }
        const pushedChild = topIdx > notifIdx;
        // 알림 항목 탭으로 이미 true인 경우, blur 시점 getState 레이스로 덮어쓰이지 않도록 OR
        preserveListOnNextFocusRef.current =
          preserveListOnNextFocusRef.current || pushedChild;
      } catch {
        preserveListOnNextFocusRef.current = false;
      }
    };

    const unsubscribe = navigation?.addListener?.('focus', onFocus);
    const blurUnsubscribe = navigation?.addListener?.('blur', onBlur);

    // focus 리스너 등록 시점에 이미 화면이 포커스 상태일 수 있어
    // 초기 진입에서 최신 알림 로드가 누락되지 않도록 1회 즉시 실행한다.
    if (navigation?.isFocused?.() && !didRunInitialFocusSyncRef.current) {
      didRunInitialFocusSyncRef.current = true;
      onFocus();
    }

    return () => {
      unsubscribe?.();
      blurUnsubscribe?.();
    };
  }, [
    navigation,
    flushPendingReads,
    fetchNotifications,
    markNotificationsSeenForBell,
    markFriendRequestsSeenForBell,
    selectedTab,
  ]);

  // 알림 화면이 열려 있는 동안 소켓으로 새 알림(hasUnread=true)이 들어오면
  // 목록을 즉시 새로고침해서 방금 도착한 알림도 리스트에 바로 보이도록 한다.
  useEffect(() => {
    if (!hasUnread) return;
    if (!navigation?.isFocused || !navigation.isFocused()) return;
    if (isPullRefreshing || loading || loadingMore || tabHydrating || isResetFetchingRef.current) return;

    // 서버 기준 최신 알림 목록을 불러오고, 화면에서는 이미 본 것으로 간주하므로 빨간 점은 다시 끈다.
    fetchNotifications(1, false);
    markNotificationsSeenForBell?.();
  }, [
    hasUnread,
    navigation,
    fetchNotifications,
    markNotificationsSeenForBell,
    isPullRefreshing,
    loading,
    loadingMore,
    tabHydrating,
  ]);

  // 5️⃣ 앱 종료/백그라운드 대비: 상태 전환 시, 그리고 언마운트 시 pending 읽음 요청 강제 전송
  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/active/) && nextState.match(/inactive|background/)) {
        // 앱이 background/inactive 로 갈 때 남은 읽음 요청을 강제로 flush
        flushPendingReads();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      sub.remove();
      // 화면 떠날 때도 남은 읽음 요청 전송
      flushPendingReads();
    };
  }, []);

  const baseFiltered =
    selectedTab === 'all'
      ? notifications
      : notifications.filter((n) => n.category === selectedTab);

  const filteredNotifications = useMemo(() => {
    const enriched = baseFiltered.map((item) => {
      if (!isStudySummaryNotification(item)) return item;
      const fallbackWatchers = normalizeWatchers(getStudySummaryWatchers?.(item));
      const watchers = item.watchers?.length ? item.watchers : fallbackWatchers;
      return { ...item, watchers };
    });
    return sortNotificationsByCreatedDesc(enriched);
  }, [baseFiltered, getStudySummaryWatchers]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    if (selectedTab === 'all') {
      setTabHydrating(false);
      return undefined;
    }
    if (loading || loadingMore || isPullRefreshing) return undefined;
    if (!hasMoreRef.current) {
      setTabHydrating(false);
      return undefined;
    }
    let cancelled = false;
    const hydrate = async () => {
      setTabHydrating(true);
      while (!cancelled && hasMoreRef.current) {
        const nextPage = pageRef.current + 1;
        await fetchNotifications(nextPage, true);
      }
      if (!cancelled) {
        setTabHydrating(false);
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [selectedTab, loading, loadingMore, isPullRefreshing, fetchNotifications]);

  const unreadCounts = useMemo(() => {
    const list = notifications;
    const getUnreadFlag = (n) => !n?.isRead;
    const allUnread = list.filter((n) => getUnreadFlag(n) && !tappedIds[n.id]).length;
    const postUnread = list.filter((n) => n.category === 'post' && getUnreadFlag(n) && !tappedIds[n.id]).length;
    const mailUnread = list.filter((n) => n.category === 'mail' && getUnreadFlag(n) && !tappedIds[n.id]).length;
    const systemUnread = list.filter((n) => n.category === 'system' && getUnreadFlag(n) && !tappedIds[n.id]).length;
    return { allUnread, postUnread, mailUnread, systemUnread };
  }, [notifications, tappedIds]);

  const tabs = useMemo(
    () => [
      { key: 'all', label: '전체', count: unreadCounts.allUnread },
      { key: 'post', label: '게시글', count: unreadCounts.postUnread },
      { key: 'mail', label: '우편함', count: unreadCounts.mailUnread },
      { key: 'system', label: '시스템', count: unreadCounts.systemUnread },
    ],
    [unreadCounts],
  );
  const showSkeleton = loading || isPullRefreshing || tabHydrating;

  const openDmRoom = useCallback(async (watcher) => {
    if (!watcher?.userId) {
      console.log('[NotificationScreen] DM 이동 스킵: watcher.userId 없음', { watcher });
      return;
    }
    try {
      const res = await api.post('/api/dm/rooms', { otherUserId: watcher.userId });
      const roomId = res?.data?.data?.id;
      if (roomId == null) {
        console.log('[NotificationScreen] DM 이동 실패: roomId 없음', {
          watcherUserId: watcher.userId,
        });
        return;
      }
      let friendPayload = { id: watcher.userId, name: watcher.name };
      try {
        const roomsRes = await api.get('/api/dm/rooms', { params: { page: 1, limit: 100 } });
        const rooms = Array.isArray(roomsRes?.data?.data?.rooms) ? roomsRes.data.data.rooms : [];
        const room = rooms.find((r) => String(r?.id) === String(roomId));
        if (room) {
          const colorIndexRaw =
            room.other_user_color_id != null
              ? Number(room.other_user_color_id)
              : null;
          const safeColorIndex =
            Number.isFinite(colorIndexRaw) && colorIndexRaw >= 0
              ? colorIndexRaw % DM_ICON_COLOR_COUNT
              : 0;
          friendPayload = {
            id: room.other_user_id ?? watcher.userId,
            name: room.other_user_name || watcher.name || '친구',
            schoolName: room.other_user_school_name || '',
            colorIndex: safeColorIndex,
          };
        }
      } catch (friendError) {
        console.log('[NotificationScreen] DM friend 정보 보강 실패, 기본 payload 사용', {
          watcherUserId: watcher.userId,
          message: friendError?.message,
        });
      }
      preserveListOnNextFocusRef.current = true;
      console.log('[NotificationScreen] study summary -> DMChat 이동', {
        watcherUserId: watcher.userId,
        watcherName: watcher.name,
        roomId,
        friendPayload,
      });
      navigation?.navigate('DMChat', {
        roomId,
        friend: friendPayload,
      });
    } catch (error) {
      console.error('[NotificationScreen] DM 이동 실패:', error?.response?.data || error);
    }
  }, [navigation]);

  const handlePressNotification = (n) => {
    // 실제로 눌렀을 때만 배경색 제거 (확인한 알림으로 표시)
    console.log('[NotificationScreen] 알림 탭', {
      id: n.id,
      type: n.type,
      category: n.category,
      relatedType: n.relatedType,
      relatedId: n.relatedId,
    });
    setTappedIds((prev) => ({ ...prev, [n.id]: true }));

    pendingReadIdsRef.current.add(n.id);
    scheduleFlush();

    // 3️⃣ 알림 키에 따라 목적지 분기
    if (isStudySummaryNotification(n)) {
      const watchers = normalizeWatchers(
        n.watchers?.length ? n.watchers : getStudySummaryWatchers?.(n),
      );
      console.log('[NotificationScreen] study summary notification pressed', {
        notificationId: n.id,
        watchersCount: watchers.length,
        relatedType: n.relatedType,
        relatedId: n.relatedId,
      });
      if (
        watchers.length === 0 &&
        (n.relatedType === 'friend_study_finished_summary_single' ||
          n.relatedType === 'study_summary_single') &&
        n.relatedId != null
      ) {
        console.log('[NotificationScreen] study summary single fallback -> relatedId로 DM 이동', {
          notificationId: n.id,
          relatedId: n.relatedId,
        });
        openDmRoom({ userId: String(n.relatedId), name: '친구' });
        return;
      }
      if (watchers.length === 1) {
        openDmRoom(watchers[0]);
        return;
      }
      if (watchers.length > 1) {
        console.log('[NotificationScreen] study summary 다중 대기자 드롭다운 토글', {
          notificationId: n.id,
        });
        setExpandedSummaryById((prev) => ({
          ...prev,
          [n.id]: !prev[n.id],
        }));
      }
      return;
    }

    // 1) 친구 요청 계열
    if (n.type === 'friend_request') {
      preserveListOnNextFocusRef.current = true;
      navigation?.navigate('Friends');
      return;
    }

    // 2) 게시글/댓글/대댓글 관련 (댓글 달림, 대댓글 달림, 인기글 등록 등)
    if (n.category === 'post' || n.relatedType === 'post') {
      if (n.relatedId) {
        preserveListOnNextFocusRef.current = true;
        navigation?.navigate('BoardDetail', {
          post: {
            id: n.relatedId,
            author: '익명',
            time: '',
            location: '',
            content: '',
            likes: 0,
            comments: 0,
          },
          isMyPost: false,
        });
      }
      return;
    }

    // 3) 우편/쪽지 관련
    if (n.category === 'mail' || n.type === 'mail') {
      // (1) 개인 익명 우편 (personal_mail)
      if (n.relatedType === 'personal_mail' && n.relatedId) {
        preserveListOnNextFocusRef.current = true;
        navigation?.navigate('MailDetail', {
          mail: {
            id: n.relatedId,
            receivedAt: n.time,
            content: n.content,
            is_read: false,
          },
        });
        return;
      }

      // (2) 기본: 메시지/우편 화면 루트로 이동
      preserveListOnNextFocusRef.current = false;
      popToMainRoot(navigation);
      return;
    }

    // 4) 시스템 알림 (예: 인기 게시글 등록 등)
    if (n.category === 'system') {
      if (n.relatedType === 'post' && n.relatedId) {
        preserveListOnNextFocusRef.current = true;
        navigation?.navigate('BoardDetail', {
          post: {
            id: n.relatedId,
            author: '익명',
            time: '',
            location: '',
            content: '',
            likes: 0,
            comments: 0,
          },
          isMyPost: false,
        });
        return;
      }

      // 그 외 시스템 알림은 일단 메인으로 이동 (원하면 마이페이지 등으로 변경 가능)
      preserveListOnNextFocusRef.current = false;
      popToMainRoot(navigation);
      return;
    }

    // 기본: 특별한 분기 없으면 아무 동작 안 함
  };

  return (
    <View style={[styles.rootWrapper, getDebugBorderStyle('#FF3B30')]}>
      <SafeAreaView style={[styles.container, getDebugBorderStyle('#FF9500')]} edges={['top']}>
        <SubHeader
          title="알림"
          onBack={() => navigation?.goBack()}
          rightButtonText="모두 읽음"
          onRightPress={handleMarkAllRead}
        />

      {/* 탭 메뉴 */}
      <View style={[styles.tabContainer, getDebugBorderStyle('#FFCC00')]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabContent, getDebugBorderStyle('#34C759')]}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                selectedTab === tab.key && styles.tabButtonActive,
                getDebugBorderStyle('#007AFF'),
              ]}
              onPress={() => {
                if (tab.key !== 'all') setTabHydrating(true);
                else setTabHydrating(false);
                setSelectedTab(tab.key);
              }}>
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.key && styles.tabTextActive,
                ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && <View style={styles.tabUnreadDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 알림 목록 - FlatList + 무한 스크롤 */}
      <FlatList
        style={[styles.scrollView, getDebugBorderStyle('#5856D6')]}
        data={showSkeleton ? [] : filteredNotifications}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={handleRefresh}
        renderItem={({ item: notification }) => {
          const isTapped = tappedIds[notification.id];
          const isUnreadFromServer = !notification.isRead;
          const isStudySummary = isStudySummaryNotification(notification);
          const watchers = normalizeWatchers(notification.watchers);
          const canExpandWatchers = isStudySummary && watchers.length > 1;
          const isExpanded = Boolean(expandedSummaryById[notification.id]);
          // 서버 기준으로 아직 안 읽은 알림 + 실제로 눌러서 확인하지 않은 것만 연한 초록 배경 + 점 표시
          const showUnreadStyle = isUnreadFromServer && !isTapped;
          const hidePreviewText =
            notification.category === 'mail' ||
            notification.type === 'comment' ||
            notification.type === 'reply';
          return (
            <TouchableOpacity
              style={[
                styles.notificationItem,
                showUnreadStyle && styles.notificationItemUnread,
                getDebugBorderStyle('#AF52DE'),
              ]}
              onPress={() => handlePressNotification(notification)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                ]}
              >
                <Ionicons
                  name={notification.icon}
                  size={styles.notificationIcon.size}
                  color={notification.iconColor}
                />
              </View>

              <View style={[styles.notificationContent, getDebugBorderStyle('#5AC8FA')]}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {!hidePreviewText ? (
                  <Text style={styles.notificationText} numberOfLines={2}>
                    {notification.content}
                  </Text>
                ) : null}
                <Text style={styles.notificationTime}>{notification.time}</Text>
                {canExpandWatchers && isExpanded ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.summaryWatcherRow,
                      getDebugBorderStyle('#30B0C7'),
                    ]}
                  >
                    {watchers.map((watcher, idx) => (
                      <TouchableOpacity
                        key={`${notification.id}-${watcher.userId}-${idx}`}
                        style={[styles.summaryWatcherChip, getDebugBorderStyle('#64D2FF')]}
                        activeOpacity={0.8}
                        onPress={() => openDmRoom(watcher)}
                      >
                        <View
                          style={styles.summaryWatcherAvatar}
                        >
                          <ProfileIcon
                            width={styles.summaryWatcherProfileIcon.width}
                            height={styles.summaryWatcherProfileIcon.height}
                            color={getProfileInnerColor(watcher.colorId)}
                          />
                        </View>
                        <Text style={styles.summaryWatcherName} numberOfLines={1}>
                          {watcher.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              {showUnreadStyle && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          showSkeleton ? (
            <View style={[styles.skeletonContainer, getDebugBorderStyle('#32D74B')]}>
              {[1, 2, 3, 4, 5, 6].map((key) => (
                <SkeletonRow key={key} skeletonStyles={skeletonStyles} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyContainer, getDebugBorderStyle('#0A84FF')]}>
              <Ionicons
                name="notifications-off-outline"
                size={styles.emptyIcon.size}
                color={styles.emptyIcon.color}
              />
              <Text style={styles.emptyTitle}>아직 새로운 소식이 없어요</Text>
              {/*
                TODO(marketing-consent):
                마케팅 동의 사용자 대상으로
                "인기 게시글을 확인해 보세요" 알림 문구/플로우 적용 예정
              */}
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => popToMainRoot(navigation)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyButtonText}>인기글 보러가기</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore && !tabHydrating ? (
            <View style={[styles.footerLoader, getDebugBorderStyle('#BF5AF2')]}>
              <Text style={styles.footerLoaderText}>더 불러오는 중...</Text>
            </View>
          ) : null
        }
        onMomentumScrollBegin={() => {
          endReachedLockRef.current = false;
        }}
        onEndReached={() => {
          if (endReachedLockRef.current) return;
          endReachedLockRef.current = true;
          if (!tabHydrating && !loadingMore && hasMore) {
            fetchNotifications(page + 1, true);
          }
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[
          styles.contentContainer,
          filteredNotifications.length === 0 && { flex: 1 },
          getDebugBorderStyle('#FFD60A'),
        ]}
      />
      </SafeAreaView>
    </View>
  );
};

export default NotificationScreen;