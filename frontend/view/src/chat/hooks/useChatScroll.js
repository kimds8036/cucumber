import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export default function useChatScroll({
  roomId,
  messages,
  flatData,
  isLoading,
  isLoadingMore,
  loadMore,
}) {
  const listRef = useRef(null);
  const currentOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
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
  const firstVisibleIdRef = useRef(null);
  const pendingAnchorIdRef = useRef(null);

  const [listShellVisible, setListShellVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // roomId 변경 시 ref 초기화
  useEffect(() => {
    isLoadingMoreRef.current = false;
    loadOlderAllowedRef.current = false;
    didListShellLayoutRef.current = false;
    isNearBottomRef.current = true;
    prevNewestIdRef.current = null;
    isScrollingRef.current = false;
    contentHeightRef.current = 0;
    currentOffsetRef.current = 0;
    didInitialAnchorRef.current = false;
    isInitialLoadRef.current = true;
    firstVisibleIdRef.current = null;
    pendingAnchorIdRef.current = null;
    setListShellVisible(false);
  }, [roomId]);

  // 공통 loadMore 트리거 (onStartReached + 프리페치 둘 다 여기 사용)
  const triggerLoadMore = useCallback(() => {
    // 초기 앵커링(맨 아래로 스크롤)이 끝나기 전에는 절대 페이징하지 않는다.
    if (isInitialLoadRef.current || !didInitialAnchorRef.current) return;
    if (!loadOlderAllowedRef.current) return;
    if (isLoading || isLoadingMore) return;
    if (isLoadingMoreRef.current) return;

    // 현재 화면 맨 위에 보이는 메시지를 anchor로 기억 (아이템 기반)
    if (firstVisibleIdRef.current) {
      pendingAnchorIdRef.current = firstVisibleIdRef.current;
    }

    isLoadingMoreRef.current = true;
    loadMore().finally(() => {
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    });
  }, [isLoading, isLoadingMore, loadMore]);

  // 스크롤 이벤트 핸들러 + 프리페치 기반 페이징
  const handleScroll = useCallback(
    (e) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
      const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
      contentHeightRef.current = contentH;
      currentOffsetRef.current = offsetY;

      isScrollingRef.current = true;
      if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
      scrollAnimationRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);

      const threshold = Math.max(80, viewportH * 0.1);
      isNearBottomRef.current = offsetY + viewportH >= contentH - threshold;
      // 초기 앵커링이 끝난 뒤, 사용자가 하단에서 벗어나 위로 스크롤한 이후에만 과거 로딩 허용
      if (
        didInitialAnchorRef.current &&
        !isInitialLoadRef.current &&
        !isNearBottomRef.current
      ) {
        loadOlderAllowedRef.current = true;
      }
    },
    [],
  );

  // 새 메시지 자동 스크롤
  useEffect(() => {
    if (!messages?.length) return;
    // messages 마지막 요소가 가장 최신이라고 가정 ([과거 → 최신])
    const newest = messages[messages.length - 1];
    const newestId = newest?.id;
    if (!newestId || prevNewestIdRef.current === newestId) return;

    const shouldAutoscroll = newest?.isMe || isNearBottomRef.current;
    if (shouldAutoscroll && !isScrollingRef.current) {
      if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
      scrollAnimationRef.current = setTimeout(() => {
        // inverted 리스트에서 "리스트 끝(최신)"으로 이동하려면 scrollToEnd 사용
        listRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }

    prevNewestIdRef.current = newestId;
  }, [messages]);

  // 키보드 이벤트 → 자동 스크롤
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e?.endCoordinates?.height ?? 0);
        if (messages?.length > 0 && isNearBottomRef.current) {
          keyboardTimeoutRef.current = setTimeout(() => {
            listRef.current?.scrollToEnd?.({ animated: true });
          }, Platform.OS === 'ios' ? 100 : 200);
        }
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        if (keyboardTimeoutRef.current)
          clearTimeout(keyboardTimeoutRef.current);
      },
    );
    return () => {
      show.remove();
      hide.remove();
      if (keyboardTimeoutRef.current)
        clearTimeout(keyboardTimeoutRef.current);
    };
  }, [messages?.length]);

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
      // inverted 환경에서 "리스트 끝(최신)"이 보이는 위치(바닥)에 맞추기 위해 scrollToEnd 사용
      listRef.current?.scrollToEnd?.({ animated: false });
      didInitialAnchorRef.current = true;
      setListShellVisible(true);
      // 사용자가 실제로 위로 스크롤하기 전까지는 과거 로딩을 막는다.
      loadOlderAllowedRef.current = false;
      isInitialLoadRef.current = false;
    });
  }, [isLoading, messages, roomId]);

  // 과거 로딩 (handleStartReached) — 맨 꼭대기 도달 시 백업용 트리거
  const handleStartReached = useCallback(() => {
    triggerLoadMore();
  }, [triggerLoadMore]);

  // FlashList viewability 콜백: 현재 화면 맨 위 메시지의 id를 기억
  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (!Array.isArray(viewableItems) || viewableItems.length === 0) return;
    // 가장 위에 있는(가장 작은 index) 메시지 중 dateBanner가 아닌 것을 anchor로 사용
    let candidate = null;
    for (let i = 0; i < viewableItems.length; i += 1) {
      const v = viewableItems[i];
      const item = v?.item;
      if (!item) continue;
      if (item.type === 'dateBanner') continue;
      if (!candidate || v.index < candidate.index) {
        candidate = v;
      }
    }
    if (candidate?.item?.id != null) {
      firstVisibleIdRef.current = String(candidate.item.id);
    }
  }, []);

  // loadMore 이후 anchor 복원: prepend가 끝난 뒤에도 사용자가 보던 메시지가 그대로 보이도록
  useEffect(() => {
    const anchorId = pendingAnchorIdRef.current;
    if (!anchorId) return;
    if (!flatData || flatData.length === 0) return;

    const targetIndex = flatData.findIndex(
      (item) =>
        item?.type !== 'dateBanner' && String(item?.id) === String(anchorId),
    );
    if (targetIndex < 0) {
      pendingAnchorIdRef.current = null;
      return;
    }

    // FlashList가 layout을 갱신한 뒤에 anchor로 스크롤
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({
        index: targetIndex,
        animated: false,
        viewPosition: 0, // 화면 상단에 anchor 고정
      });
      pendingAnchorIdRef.current = null;
    });
  }, [flatData]);

  return {
    listRef,
    listShellVisible,
    keyboardHeight,
    handleScroll,
    handleListShellLayout,
    handleStartReached,
    handleViewableItemsChanged,
    isNearBottomRef,
    currentOffsetRef,
    contentHeightRef,
  };
}
