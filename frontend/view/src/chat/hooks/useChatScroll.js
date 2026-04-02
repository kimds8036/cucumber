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
  const prevContentHeightRef = useRef(0);
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
    setListShellVisible(false);
  }, [roomId]);

  // 공통 loadMore 트리거 (onStartReached + 프리페치 둘 다 여기 사용)
  const triggerLoadMore = useCallback(() => {
    // 초기 앵커링(맨 아래로 스크롤)이 끝나기 전에는 절대 페이징하지 않는다.
    if (isInitialLoadRef.current || !didInitialAnchorRef.current) return;
    if (!loadOlderAllowedRef.current) return;
    if (isLoading || isLoadingMore) return;
    if (isLoadingMoreRef.current) return;
    // loadMore 직전 contentHeight 스냅샷
    prevContentHeightRef.current = contentHeightRef.current || 0;
    // 이번 페이징 세션에서는 아직 보정이 수행되지 않았다고 표시
    didCorrectionForCurrentLoadRef.current = false;
    // 디버깅: 페이징 시작 시점의 높이 정보
    // eslint-disable-next-line no-console
    console.log(
      '[ChatScroll] triggerLoadMore',
      'contentHeight:',
      contentHeightRef.current,
      'prevContentHeight:',
      prevContentHeightRef.current,
    );
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

      // 디버깅: 페이징 중일 때만 현재 offset 로그
      if (isLoadingMoreRef.current) {
        // eslint-disable-next-line no-console
        console.log('[ChatScroll] handleScroll while loadingMore, offsetY:', offsetY);
      }

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
    // 과거 페이징(loadMore) 중이거나 보정 쿨타임 동안에는 자동 스크롤 금지
    if (isLoadingMoreRef.current || loadOlderAllowedRef.current === false) return;
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

  // FlashList onContentSizeChange 기반 스크롤 위치 보정
  /** 리스트 뷰포트 높이가 바뀐 뒤(예: 상단 PostCard 로드) 최신 메시지 쪽으로 다시 맞출 때 */
  const scrollToLatest = useCallback((options = {}) => {
    const animated = options.animated ?? false;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated });
    });
  }, []);

  const handleContentSizeChange = useCallback(
    (width, height) => {
      const prevH = prevContentHeightRef.current || 0;
      contentHeightRef.current = height;
      // 초기/일반 렌더링 시점에서는 contentHeight 스냅샷만 갱신하고 보정은 하지 않는다.
      if (!isLoadingMoreRef.current) {
        prevContentHeightRef.current = height;
        return;
      }

      let diff = height - prevH;
      if (diff <= 0) {
        // eslint-disable-next-line no-console
        console.log(
          '[ChatScroll] handleContentSizeChange diff<=0, height:',
          height,
          'prevH:',
          prevH,
          'diff:',
          diff,
        );
        return;
      }

      const MIN_DIFF_THRESHOLD = 100;
      // 스피너 등장 등 미세한 레이아웃 변화(소량 높이 변화)는 보정 대상에서 제외
      if (diff < MIN_DIFF_THRESHOLD) {
        // eslint-disable-next-line no-console
        console.log(
          '[ChatScroll] handleContentSizeChange small diff, skip correction',
          'height:',
          height,
          'prevH:',
          prevH,
          'diff:',
          diff,
        );
        prevContentHeightRef.current = height;
        return;
      }

      // 한 번이라도 보정을 수행했다면, 동일 페이징 세션 내에서는 추가 보정 금지
      if (didCorrectionForCurrentLoadRef.current) {
        // eslint-disable-next-line no-console
        console.log(
          '[ChatScroll] handleContentSizeChange [Correction Blocked - Already Done]',
          'height:',
          height,
          'prevH:',
          prevH,
          'diff:',
          diff,
        );
        return;
      }

      const originalDiff = diff;
      // 비정상적으로 큰 점프를 방지하기 위해 상한선을 둔다.
      diff = Math.min(diff, 2000);
      if (originalDiff !== diff) {
        // eslint-disable-next-line no-console
        console.log(
          '[ChatScroll] handleContentSizeChange diff clamped',
          'originalDiff:',
          originalDiff,
          'clampedDiff:',
          diff,
        );
      }

      const currentOffset = currentOffsetRef.current || 0;
      // 이미 천장(상단 근처)에 붙어 다음 페이징을 시도 중이라면,
      // 이전 페이징에 대한 보정은 뒷북이 되므로 과감히 스킵한다.
      const topThreshold = 40;
      if (currentOffset <= topThreshold) {
        // 디버깅: 상단에서 보정 스킵
        // eslint-disable-next-line no-console
        console.log(
          '[ChatScroll] handleContentSizeChange [Skip] User is at top, avoiding jump',
          'height:',
          height,
          'prevH:',
          prevH,
          'diff:',
          diff,
          'currentOffset:',
          currentOffset,
        );
        // 그래도 contentHeight 스냅샷은 최신으로 유지
        prevContentHeightRef.current = height;
        // 잠시 동안 추가 페이징과 자동 스크롤을 막는 쿨타임만 유지
        loadOlderAllowedRef.current = false;
        setTimeout(() => {
          loadOlderAllowedRef.current = true;
        }, 300);
        return;
      }

      const newOffset = currentOffset + diff;

      // 디버깅: 실제 보정이 어떻게 적용되는지 로그
      // eslint-disable-next-line no-console
      console.log(
        '[ChatScroll] handleContentSizeChange [Correction Applied]',
        'height:',
        height,
        'prevH:',
        prevH,
        'diff:',
        diff,
        'currentOffset:',
        currentOffset,
        'newOffset:',
        newOffset,
      );

      // 첫 번째 보정은 레이아웃 안착 후 부드럽게 넘기기 위해 한 번만 animated: true 사용
      const applyScroll = () => {
        listRef.current?.scrollToOffset?.({
          offset: newOffset,
          animated: !firstCorrectionDoneRef.current, // 첫 보정만 true
        });
        currentOffsetRef.current = newOffset;
        firstCorrectionDoneRef.current = true;
        didCorrectionForCurrentLoadRef.current = true;
      };

      if (!firstCorrectionDoneRef.current) {
        requestAnimationFrame(applyScroll);
      } else {
        applyScroll();
      }

      // 잠시 동안 추가 페이징과 자동 스크롤을 막아 무한 페이징/하단 튐 방지 (쿨타임)
      loadOlderAllowedRef.current = false;
      setTimeout(() => {
        loadOlderAllowedRef.current = true;
      }, 300);
    },
    [],
  );

  return {
    listRef,
    listShellVisible,
    keyboardHeight,
    handleScroll,
    handleListShellLayout,
    handleStartReached,
    handleContentSizeChange,
    scrollToLatest,
    isNearBottomRef,
    currentOffsetRef,
    contentHeightRef,
  };
}
