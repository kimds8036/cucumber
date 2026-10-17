import { useEffect, useRef } from 'react';

export function useAutoRefresh(refresh, intervalMs = 30000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let timer = 0;
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      stop();
      if (document.visibilityState === 'hidden') return;
      timer = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        refreshRef.current?.();
      }, intervalMs);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}

export function usePullRefresh(onRefresh) {
  const startY = useRef(0);
  const onTouchStart = (event) => {
    startY.current = event.touches?.[0]?.clientY || 0;
  };
  const onTouchEnd = (event) => {
    const endY = event.changedTouches?.[0]?.clientY || 0;
    const scroller = event.currentTarget?.closest?.('.m-body') || event.currentTarget;
    if ((scroller?.scrollTop || 0) > 0) return;
    if (endY - startY.current > 72) onRefresh?.();
  };
  return { onTouchStart, onTouchEnd };
}
