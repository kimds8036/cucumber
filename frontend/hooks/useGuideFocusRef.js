import { useCallback, useEffect, useRef } from 'react';
import { useGuidePreview } from '../context/GuidePreviewContext';

/**
 * 가이드 오버레이용 — activeFocusTarget 과 일치할 때 measureInWindow 로 구멍 위치 보고
 * @param {string} targetKey — GUIDE_STEPS[].focusTarget 과 동일 키
 */
export function useGuideFocusRef(targetKey) {
  const ref = useRef(null);
  const {
    isGuidePreview,
    activeFocusTarget,
    onFocusRect,
    focusMeasureKey,
  } = useGuidePreview();

  const isActive =
    Boolean(isGuidePreview) &&
    Boolean(targetKey) &&
    activeFocusTarget === targetKey;

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      onFocusRect?.({ x, y, w: width, h: height });
    });
  }, [onFocusRect]);

  useEffect(() => {
    if (!isActive) return undefined;
    const timers = [0, 80, 200, 450].map((ms) => setTimeout(measure, ms));
    return () => timers.forEach(clearTimeout);
  }, [isActive, focusMeasureKey, measure]);

  const onLayout = useCallback(() => {
    if (isActive) measure();
  }, [isActive, measure]);

  return { ref, onLayout, isActive };
}
