import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  maybeRefreshAutoTimetableOnAppOpen,
  resolveTimetableCacheKeyForCurrentUser,
} from '../utils/timetableSync';

/**
 * 로그인 후 앱 실행·포그라운드 복귀 시 auto 시간표 주간 NEIS 갱신(캐시·위젯 포함).
 * 렌더 없음.
 */
export default function AutoTimetableRefreshOnLaunch() {
  const { isLoggedIn, authHydrated } = useAuth();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || !isLoggedIn) return undefined;

    let cancelled = false;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const cacheKey = await resolveTimetableCacheKeyForCurrentUser();
        if (!cacheKey || cancelled) return;
        await maybeRefreshAutoTimetableOnAppOpen(cacheKey);
      } finally {
        runningRef.current = false;
      }
    };

    run();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !cancelled) {
        run();
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [authHydrated, isLoggedIn]);

  return null;
}
