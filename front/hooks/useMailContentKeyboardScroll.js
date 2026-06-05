import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * 우편 작성 화면: 내용 섹션 포커스 시 키보드 애니메이션 종료 후 한 번만 스크롤 (끊김 방지).
 */
export function useMailContentKeyboardScroll({
  scrollRef,
  scrollContentRef,
  contentSectionRef,
  normalize,
}) {
  const contentFocusedRef = useRef(false);
  const keyboardOpenRef = useRef(false);
  const scrollTimerRef = useRef(null);
  const [contentFocused, setContentFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const clearScrollTimer = useCallback(() => {
    if (scrollTimerRef.current != null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
  }, []);

  const scrollContentSectionToVisibleTop = useCallback(() => {
    const section = contentSectionRef.current;
    const content = scrollContentRef.current;
    const scroll = scrollRef.current;
    if (!section || !content || !scroll) return;

    section.measureLayout(content, (_x, y) => {
      const topInset = normalize(8);
      scroll.scrollTo({
        y: Math.max(0, y - topInset),
        animated: true,
      });
    });
  }, [contentSectionRef, normalize, scrollContentRef, scrollRef]);

  const scheduleContentScrollOnce = useCallback(
    (delayMs = 0) => {
      clearScrollTimer();
      scrollTimerRef.current = setTimeout(() => {
        scrollTimerRef.current = null;
        requestAnimationFrame(() => {
          scrollContentSectionToVisibleTop();
        });
      }, delayMs);
    },
    [clearScrollTimer, scrollContentSectionToVisibleTop],
  );

  const handleContentFocus = useCallback(() => {
    contentFocusedRef.current = true;
    setContentFocused(true);
    if (keyboardOpenRef.current) {
      scheduleContentScrollOnce(Platform.OS === 'ios' ? 32 : 72);
    }
  }, [scheduleContentScrollOnce]);

  const handleContentBlur = useCallback(() => {
    contentFocusedRef.current = false;
    setContentFocused(false);
    clearScrollTimer();
  }, [clearScrollTimer]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardOpenRef.current = true;
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      if (!contentFocusedRef.current) return;

      const delay =
        Platform.OS === 'ios'
          ? Math.max(32, Math.round((e.duration ?? 250) * 0.92))
          : 72;
      scheduleContentScrollOnce(delay);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOpenRef.current = false;
      setKeyboardOpen(false);
      setKeyboardHeight(0);
      clearScrollTimer();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      clearScrollTimer();
    };
  }, [clearScrollTimer, scheduleContentScrollOnce]);

  return {
    contentFocused,
    keyboardOpen,
    keyboardHeight,
    handleContentFocus,
    handleContentBlur,
  };
}
