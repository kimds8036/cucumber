import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import {
  CHAT_INITIAL_SCROLL_SETTLE_MAX_MS,
  CHAT_SILENT_PREFETCH_DELAY_MS,
} from '../constants/chatConfig';

/** inverted FlashList: 최신이 스크롤 '끝'(큰 offset)에 있을 때, 뷰포트 하단~콘텐츠 하단 거리 */
function computeDistanceFromBottom(contentH, offsetY, viewportH) {
  if (!contentH || viewportH <= 0) return 0;
  const oy = Math.max(0, offsetY);
  return Math.max(0, contentH - oy - viewportH);
}

export default function useChatScroll({
  roomId,
  messages,
  flatData,
  isLoading,
  isLoadingMore,
  loadMore,
  loadMoreSilent,
  hasMore,
}) {
  const listRef = useRef(null);
  const currentOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  /** 바닥(최신) 기준 논리 거리 — 스크롤 시 실시간 갱신 */
  const distanceFromBottomRef = useRef(0);
  /** API 종료 후에도 큰 prepend 레이아웃이 늦게 올 수 있어 isLoadingMoreRef 대신 보정 허용 */
  const pagingAnchorPendingRef = useRef(false);
  /** prepend 보정 완료 전 — 자동 scrollToEnd·키보드 스크롤 등 경쟁 호출 차단 */
  const prependScrollLockRef = useRef(false);
  const pagingSessionClearTimeoutRef = useRef(null);
  const prevContentHeightRef = useRef(0);
  /** handleScroll에서 본 contentSize.max — FlashList 일시적 축소(prevH 난조) 보정용 */
  const maxContentHeightSeenRef = useRef(0);
  const didCorrectionForCurrentLoadRef = useRef(false);
  const firstCorrectionDoneRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const isScrollingRef = useRef(false);
  const scrollAnimationRef = useRef(null);
  const prevNewestIdRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const loadOlderAllowedRef = useRef(false);
  const didListShellLayoutRef = useRef(false);
  const didInitialAnchorRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const keyboardTimeoutRef = useRef(null);
  /** 바닥 거리 디버그 로그 스로틀 (ms) */
  const bottomDistLogLastMsRef = useRef(0);
  const didSilentPrefetchRef = useRef(false);
  /** scrollToEnd 직후 한 프레임 더 지난 뒤 true — silent prefetch와 경쟁 방지 */
  const silentPrefetchReadyRef = useRef(false);
  /** 백그라운드 프리페치 1회 완료(성공·스킵·실패) — 초기 스크롤 오버레이 해제용 */
  const silentPrefetchCompletedRef = useRef(false);
  const initialAnchorLoggedRef = useRef(false);
  /** onViewableItemsChanged — 과거 쪽(작은 index)에 가까운 가시 메시지 id */
  const topVisibleMessageIdRef = useRef(null);
  /** 페이징 직전 스냅샷: 로그·타임아웃용 (보정은 offset 스냅샷 사용) */
  const pagingAnchorMessageIdRef = useRef(null);
  /** prepend 직전 scroll offset Y (FlashList inverted — scrollToItem 대신 offset 보정) */
  const pagingScrollOffsetRef = useRef(0);
  /** prepend 직전 바닥까지 거리 — near-bottom이면 scrollToEnd */
  const pagingDistanceFromBottomRef = useRef(0);
  const flatDataRef = useRef(flatData);
  /** id -> (index, item) 캐시 */
  const idToFlatIndexRef = useRef(new Map());
  const idToItemRef = useRef(new Map());

  const [listShellVisible, setListShellVisible] = useState(false);
  /** 방 진입 직후: 백그라운드 프리페치·prepend 앵커가 끝날 때까지 터치 차단(스크롤 튐 방지) */
  const [initialScrollSettling, setInitialScrollSettling] = useState(false);

  // roomId 변경 시 ref 초기화
  useEffect(() => {
    isLoadingMoreRef.current = false;
    loadOlderAllowedRef.current = false;
    didListShellLayoutRef.current = false;
    isNearBottomRef.current = true;
    prevNewestIdRef.current = null;
    isScrollingRef.current = false;
    contentHeightRef.current = 0;
    maxContentHeightSeenRef.current = 0;
    viewportHeightRef.current = 0;
    distanceFromBottomRef.current = 0;
    pagingAnchorPendingRef.current = false;
    prependScrollLockRef.current = false;
    if (pagingSessionClearTimeoutRef.current) {
      clearTimeout(pagingSessionClearTimeoutRef.current);
      pagingSessionClearTimeoutRef.current = null;
    }
    currentOffsetRef.current = 0;
    bottomDistLogLastMsRef.current = 0;
    didInitialAnchorRef.current = false;
    isInitialLoadRef.current = true;
    didSilentPrefetchRef.current = false;
    silentPrefetchReadyRef.current = false;
    silentPrefetchCompletedRef.current = false;
    initialAnchorLoggedRef.current = false;
    topVisibleMessageIdRef.current = null;
    pagingAnchorMessageIdRef.current = null;
    pagingScrollOffsetRef.current = 0;
    pagingDistanceFromBottomRef.current = 0;
    setListShellVisible(false);
    setInitialScrollSettling(false);
  }, [roomId]);

  flatDataRef.current = flatData;

  // flatData 변경 시 id -> (index, item) 캐시를 갱신
  useEffect(() => {
    const idxMap = new Map();
    const itemMap = new Map();
    const arr = flatData || [];
    arr.forEach((it, idx) => {
      if (!it || it.type === 'dateBanner' || it.id == null) return;
      const key = String(it.id);
      idxMap.set(key, idx);
      itemMap.set(key, it);
    });
    idToFlatIndexRef.current = idxMap;
    idToItemRef.current = itemMap;
  }, [flatData]);

  /** prepend 전 ID 앵커 스냅샷 — 사용자 페이징·백그라운드 프리페치 공통 */
  const beginPagingSessionSnapshot = useCallback((options = {}) => {
    const { forceNewest = false } = options;
    const ch = Math.max(
      contentHeightRef.current || 0,
      prevContentHeightRef.current || 0,
      maxContentHeightSeenRef.current || 0,
    );
    prevContentHeightRef.current = ch;

    pagingAnchorPendingRef.current = true;
    prependScrollLockRef.current = true;
    if (pagingSessionClearTimeoutRef.current) {
      clearTimeout(pagingSessionClearTimeoutRef.current);
    }
    pagingSessionClearTimeoutRef.current = setTimeout(() => {
      pagingAnchorPendingRef.current = false;
      prependScrollLockRef.current = false;
      pagingAnchorMessageIdRef.current = null;
      pagingScrollOffsetRef.current = 0;
      pagingDistanceFromBottomRef.current = 0;
      pagingSessionClearTimeoutRef.current = null;
    }, 2800);
    didCorrectionForCurrentLoadRef.current = false;
    // 첫 백그라운드 프리페치: scrollToEnd 직후 viewability가 과거 id를 잡는 경우가 있어 최신 id만 사용
    let anchor = forceNewest ? null : topVisibleMessageIdRef.current;
    if (!anchor) {
      const arr = flatDataRef.current || [];
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        const it = arr[i];
        if (it && it.type !== 'dateBanner' && it.id != null) {
          anchor = String(it.id);
          break;
        }
      }
    }
    pagingAnchorMessageIdRef.current = anchor;
    pagingScrollOffsetRef.current = Math.max(0, currentOffsetRef.current ?? 0);
    pagingDistanceFromBottomRef.current = Math.max(
      0,
      distanceFromBottomRef.current ?? 0,
    );
    return { anchorId: pagingAnchorMessageIdRef.current };
  }, []);

  const finishInitialScrollSettling = useCallback(
    (reason) => {
      if (silentPrefetchCompletedRef.current) return;
      silentPrefetchCompletedRef.current = true;
      setInitialScrollSettling(false);
      // eslint-disable-next-line no-console
      console.log('[ChatScroll] initial scroll settle done', {
        roomId,
        reason,
      });
    },
    [roomId],
  );

  /** 첫 로드 후 hasMore면 프리페치 전까지 리스트 위에 오버레이(스크롤·튐 방지) */
  useEffect(() => {
    if (!roomId || isLoading || !messages?.length) return;
    if (!hasMore) {
      finishInitialScrollSettling('no_more_pages');
      return;
    }
    if (silentPrefetchCompletedRef.current) return;
    setInitialScrollSettling(true);
  }, [roomId, isLoading, messages?.length, hasMore]);

  /** 안전망: 레이아웃/네트워크 지연 시에도 오버레이가 무한히 남지 않게 */
  useEffect(() => {
    if (!initialScrollSettling) return;
    const t = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log('[ChatScroll] initial scroll settle timeout', {
        roomId,
        maxMs: CHAT_INITIAL_SCROLL_SETTLE_MAX_MS,
      });
      finishInitialScrollSettling('timeout');
    }, CHAT_INITIAL_SCROLL_SETTLE_MAX_MS);
    return () => clearTimeout(t);
  }, [initialScrollSettling, roomId, finishInitialScrollSettling]);

  // 공통 loadMore 트리거 (onStartReached)
  const triggerLoadMore = useCallback(() => {
    if (isInitialLoadRef.current || !didInitialAnchorRef.current) return;
    if (!loadOlderAllowedRef.current) return;
    if (isLoading || isLoadingMore) return;
    if (isLoadingMoreRef.current) return;
    const { anchorId } = beginPagingSessionSnapshot();
    // eslint-disable-next-line no-console
    console.log('[ChatScroll] 페이징 직전 앵커', {
      roomId,
      anchorId,
    });
    isLoadingMoreRef.current = true;
    loadMore().finally(() => {
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    });
  }, [isLoading, isLoadingMore, loadMore, roomId, beginPagingSessionSnapshot]);

  // 첫 로드 후 바닥에 있을 때만 한 번 — 다음 페이지를 스피너 없이 미리 붙임 (바닥 앵커 보정과 동일 세션)
  useEffect(() => {
    if (
      !roomId ||
      isLoading ||
      !hasMore ||
      typeof loadMoreSilent !== 'function'
    ) {
      return;
    }
    if (!messages?.length || didSilentPrefetchRef.current) return;

    const timer = setTimeout(async () => {
      if (didSilentPrefetchRef.current) return;
      if (!(flatDataRef.current?.length > 0)) {
        didSilentPrefetchRef.current = true;
        finishInitialScrollSettling('skip_no_flat_data');
        return;
      }
      if (!didInitialAnchorRef.current || isInitialLoadRef.current) {
        didSilentPrefetchRef.current = true;
        finishInitialScrollSettling('skip_no_initial_anchor');
        return;
      }
      if (!isNearBottomRef.current) {
        didSilentPrefetchRef.current = true;
        finishInitialScrollSettling('skip_not_near_bottom');
        return;
      }
      if (!silentPrefetchReadyRef.current) {
        didSilentPrefetchRef.current = true;
        finishInitialScrollSettling('skip_not_ready');
        return;
      }
      const { anchorId } = beginPagingSessionSnapshot({ forceNewest: true });
      // eslint-disable-next-line no-console
      console.log('[ChatScroll] 백그라운드 프리페치 직전 앵커', {
        roomId,
        anchorId,
        forceNewest: true,
        delayMs: CHAT_SILENT_PREFETCH_DELAY_MS,
      });
      try {
        await loadMoreSilent();
      } catch {
        /* noop */
      } finally {
        didSilentPrefetchRef.current = true;
        // messages.length 변경 등으로 이펙트가 재실행돼도 await 중 cleanup이 나면
        // cancelled로 settle을 막으면 안 됨(타임아웃만 남음). 완료 시 항상 settle.
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              finishInitialScrollSettling('silent_prefetch_done');
            }, 80);
          });
        });
      }
    }, CHAT_SILENT_PREFETCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [
    roomId,
    isLoading,
    hasMore,
    loadMoreSilent,
    beginPagingSessionSnapshot,
    finishInitialScrollSettling,
  ]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (!viewableItems?.length) return;
    const rows = viewableItems.filter(
      (vi) =>
        vi?.item &&
        vi.item.type !== 'dateBanner' &&
        vi.item.id != null &&
        vi.index != null,
    );
    if (!rows.length) return;
    const top = rows.reduce((a, b) => (a.index <= b.index ? a : b));
    topVisibleMessageIdRef.current = String(top.item.id);
  }, []);

  // 스크롤 이벤트 핸들러 + 프리페치 기반 페이징
  const handleScroll = useCallback(
    (e) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
      const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
      maxContentHeightSeenRef.current = Math.max(
        maxContentHeightSeenRef.current || 0,
        contentH,
      );
      contentHeightRef.current = contentH;
      if (viewportH > 0) viewportHeightRef.current = viewportH;
      currentOffsetRef.current = Math.max(0, offsetY);
      let bottomDist = distanceFromBottomRef.current;
      if (viewportH > 0) {
        bottomDist = computeDistanceFromBottom(contentH, offsetY, viewportH);
        distanceFromBottomRef.current = bottomDist;
      }

      const now = Date.now();
      if (now - bottomDistLogLastMsRef.current >= 400) {
        bottomDistLogLastMsRef.current = now;
        // eslint-disable-next-line no-console
        const nearBottomNow =
          offsetY + viewportH >= contentH - Math.max(80, viewportH * 0.1);
        console.log('[ChatScroll] scrollState', {
          roomId,
          bottomDist,
          offsetY,
          nearBottom: nearBottomNow,
          prependPending: pagingAnchorPendingRef.current,
          anchorId: pagingAnchorMessageIdRef.current,
        });
      }

      isScrollingRef.current = true;
      if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
      scrollAnimationRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);

      const threshold = Math.max(80, viewportH * 0.1);
      const oyClamped = Math.max(0, offsetY);
      isNearBottomRef.current = oyClamped + viewportH >= contentH - threshold;
      // 초기 앵커링이 끝난 뒤, 사용자가 하단에서 벗어나 위로 스크롤한 이후에만 과거 로딩 허용
      if (
        didInitialAnchorRef.current &&
        !isInitialLoadRef.current &&
        !isNearBottomRef.current
      ) {
        loadOlderAllowedRef.current = true;
      }

      // inverted: offsetY ≈ 상단(과거)까지 거리 — viewportH * 2 남았을 때 미리 페이징
      if (
        viewportH > 0 &&
        didInitialAnchorRef.current &&
        !isInitialLoadRef.current &&
        loadOlderAllowedRef.current &&
        !isLoadingMoreRef.current &&
        !pagingAnchorPendingRef.current &&
        hasMore
      ) {
        const distanceFromTop = Math.max(0, offsetY);
        const PREFETCH_THRESHOLD = viewportH * 2;
        if (distanceFromTop < PREFETCH_THRESHOLD) {
          triggerLoadMore();
        }
      }
    },
    [roomId, hasMore, triggerLoadMore],
  );

  // 새 메시지 자동 스크롤
  useEffect(() => {
    if (!messages?.length) return;
    // messages 마지막 요소가 가장 최신이라고 가정 ([과거 → 최신])
    const newest = messages[messages.length - 1];
    const newestId = newest?.id;
    if (!newestId || prevNewestIdRef.current === newestId) return;

    const blockAutoscroll =
      isLoadingMoreRef.current ||
      prependScrollLockRef.current ||
      loadOlderAllowedRef.current === false;

    const shouldAutoscroll = newest?.isMe || isNearBottomRef.current;
    if (!blockAutoscroll && shouldAutoscroll && !isScrollingRef.current) {
      if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
      scrollAnimationRef.current = setTimeout(() => {
        // inverted 리스트에서 "리스트 끝(최신)"으로 이동하려면 scrollToEnd 사용
        listRef.current?.scrollToEnd?.({ animated: true });
        isNearBottomRef.current = true;
        distanceFromBottomRef.current = 0;
      }, 100);
    }

    prevNewestIdRef.current = newestId;
  }, [messages]);

  const clearKeyboardScrollTimeout = useCallback(() => {
    if (keyboardTimeoutRef.current) {
      clearTimeout(keyboardTimeoutRef.current);
      keyboardTimeoutRef.current = null;
    }
  }, []);

  const scheduleKeyboardAutoScroll = useCallback(() => {
    clearKeyboardScrollTimeout();
    if (
      messages?.length > 0 &&
      isNearBottomRef.current &&
      !prependScrollLockRef.current
    ) {
      keyboardTimeoutRef.current = setTimeout(
        () => {
          listRef.current?.scrollToEnd?.({ animated: true });
          isNearBottomRef.current = true;
          distanceFromBottomRef.current = 0;
        },
        Platform.OS === 'ios' ? 100 : 200,
      );
    }
  }, [clearKeyboardScrollTimeout, messages?.length]);

  useKeyboardHandler(
    {
      onEnd: (e) => {
        'worklet';
        if (e.height > 0) {
          runOnJS(scheduleKeyboardAutoScroll)();
        } else {
          runOnJS(clearKeyboardScrollTimeout)();
        }
      },
    },
    [clearKeyboardScrollTimeout, scheduleKeyboardAutoScroll],
  );

  useEffect(
    () => () => {
      clearKeyboardScrollTimeout();
    },
    [clearKeyboardScrollTimeout],
  );

  // 초기 앵커링 + opacity 제어
  const handleListShellLayout = useCallback(() => {
    if (didListShellLayoutRef.current) return;
    didListShellLayoutRef.current = true;
    requestAnimationFrame(() => {
      setListShellVisible(true);
    });
  }, []);

  // 방 진입 후 첫 데이터 로딩이 끝났을 때, 한 번만 맨 아래로 스크롤
  useEffect(() => {
    if (didInitialAnchorRef.current) return;
    if (isLoading) return;
    if (!messages || messages.length === 0) return;

    requestAnimationFrame(() => {
      if (didInitialAnchorRef.current) return;
      // initialScrollIndex가 이미 맨 아래(최신)로 초기 위치를 잡음
      isNearBottomRef.current = true;
      distanceFromBottomRef.current = 0;
      didInitialAnchorRef.current = true;
      setListShellVisible(true);
      // initialScrollIndex만으로는 inverted/가변 높이에서 바닥이 어긋날 수 있어 한 번 맞춤
      listRef.current?.scrollToEnd?.({ animated: false });
      // 사용자가 실제로 위로 스크롤하기 전까지는 과거 로딩을 막는다.
      loadOlderAllowedRef.current = false;
      isInitialLoadRef.current = false;
      if (!initialAnchorLoggedRef.current) {
        initialAnchorLoggedRef.current = true;
        // eslint-disable-next-line no-console
        const latestId = messages?.[messages.length - 1]?.id;
        console.log('[ChatScroll] initial anchor ready', {
          roomId,
          latestId,
          listLen: messages?.length ?? 0,
        });
      }
      // scrollToEnd 적용 후 한 프레임 더 지나 silent prefetch 허용
      requestAnimationFrame(() => {
        silentPrefetchReadyRef.current = true;
      });
    });
  }, [isLoading, messages, roomId]);

  // 과거 로딩 (handleStartReached) — 맨 꼭대기 도달 시 백업용 트리거
  const handleStartReached = useCallback(() => {
    triggerLoadMore();
  }, [triggerLoadMore]);

  // FlashList onContentSizeChange 기반 스크롤 위치 보정
  /** 리스트 뷰포트 높이가 바뀐 뒤(예: 상단 PostCard 로드) 최신 메시지 쪽으로 다시 맞출 때 */
  const scrollToLatest = useCallback(
    (options = {}) => {
      const animated = options.animated ?? false;
      prependScrollLockRef.current = false;
      pagingAnchorPendingRef.current = false;
      pagingScrollOffsetRef.current = 0;
      pagingDistanceFromBottomRef.current = 0;
      if (pagingSessionClearTimeoutRef.current) {
        clearTimeout(pagingSessionClearTimeoutRef.current);
        pagingSessionClearTimeoutRef.current = null;
      }
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd?.({ animated });
        isNearBottomRef.current = true;
        distanceFromBottomRef.current = 0;
        // eslint-disable-next-line no-console
        console.log('[ChatScroll] 리앵커(scrollToLatest)', { roomId });
      });
    },
    [roomId],
  );

  const handleContentSizeChange = useCallback(
    (width, height) => {
      const prevH = prevContentHeightRef.current || 0;
      const inPagingSession =
        isLoadingMoreRef.current || pagingAnchorPendingRef.current;

      if (!inPagingSession) {
        // prepend 없이 높이만 크게 줄어드는 값은 종종 FlashList 재측정 노이즈 → ref 오염 방지
        if (prevH > 0 && height + 150 < prevH) {
          return;
        }
        prevContentHeightRef.current = height;
        contentHeightRef.current = height;
        return;
      }

      contentHeightRef.current = height;

      let diff = height - prevH;
      if (diff <= 0) {
        if (prevH > 0 && height + 150 < prevH) {
          return;
        }
        prevContentHeightRef.current = height;
        return;
      }

      const MIN_DIFF_THRESHOLD = 100;
      // 스피너 등장 등 미세한 레이아웃 변화(소량 높이 변화)는 보정 대상에서 제외
      if (diff < MIN_DIFF_THRESHOLD) {
        prevContentHeightRef.current = height;
        return;
      }

      // 한 번이라도 보정을 수행했다면, 동일 페이징 세션 내에서는 추가 보정 금지
      if (didCorrectionForCurrentLoadRef.current) {
        prevContentHeightRef.current = height;
        return;
      }

      // 비정상적으로 큰 점프 방지
      diff = Math.min(diff, 2000);

      // prepend 전후 content 높이 차이(diff)만큼 스크롤 offset을 보정 — FlashList 가변 높이에서
      // scrollToIndex/scrollToItem/viewPosition 추정 오차를 피함
      const applyPrependOffsetCorrection = () => {
        const distSnapshot = pagingDistanceFromBottomRef.current ?? 9999;
        const vp = viewportHeightRef.current || 0;
        const nearBottomThreshold = Math.max(80, vp * 0.08);
        const wasNearBottom = distSnapshot < nearBottomThreshold;

        const runScroll = () => {
          try {
            if (wasNearBottom) {
              listRef.current?.scrollToEnd?.({ animated: false });
              return;
            }
            const baseY = Math.max(
              0,
              pagingScrollOffsetRef.current ?? currentOffsetRef.current ?? 0,
            );
            const nextY = Math.max(0, baseY + diff);
            const list = listRef.current;
            if (typeof list?.scrollTo === 'function') {
              list.scrollTo({ y: nextY, animated: false });
            } else if (typeof list?.scrollToOffset === 'function') {
              list.scrollToOffset({ offset: nextY, animated: false });
            }
          } catch {
            /* noop */
          }
        };

        if (pagingSessionClearTimeoutRef.current) {
          clearTimeout(pagingSessionClearTimeoutRef.current);
          pagingSessionClearTimeoutRef.current = null;
        }

        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            runScroll();
          });
        });

        const anchorIdForLog = pagingAnchorMessageIdRef.current;

        firstCorrectionDoneRef.current = true;
        didCorrectionForCurrentLoadRef.current = true;
        pagingAnchorPendingRef.current = false;
        prependScrollLockRef.current = false;
        pagingAnchorMessageIdRef.current = null;

        // eslint-disable-next-line no-console
        console.log('[ChatScroll] prepend 보정(offset)', {
          roomId,
          anchorId: anchorIdForLog,
          diff,
          wasNearBottom,
          distSnapshot,
          baseY: pagingScrollOffsetRef.current,
          method: wasNearBottom ? 'scrollToEnd' : 'scrollTo:y+diff',
        });
      };

      applyPrependOffsetCorrection();

      prevContentHeightRef.current = height;

      loadOlderAllowedRef.current = false;
      setTimeout(() => {
        loadOlderAllowedRef.current = true;
      }, 300);
    },
    [roomId],
  );

  return {
    listRef,
    listShellVisible,
    initialScrollSettling,
    handleScroll,
    handleListShellLayout,
    handleStartReached,
    handleContentSizeChange,
    handleViewableItemsChanged,
    scrollToLatest,
    isNearBottomRef,
    currentOffsetRef,
    contentHeightRef,
  };
}
