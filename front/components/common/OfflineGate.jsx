import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts } from '../../styles/colors';

/** reachable=false 일시 오탐 완화 — 복귀 직후 재검사 보통 수백ms~1s */
const REACHABLE_FALSE_DEBOUNCE_MS = 2000;
/** 포그라운드 복귀 직후 NetInfo 이벤트를 잠시 무시하고 fetch로 재검사 */
const FOREGROUND_GRACE_MS = 1000;

async function loadNetInfo() {
  const mod = await import('@react-native-community/netinfo');
  return mod.default;
}

export default function OfflineGate({ children }) {
  const [online, setOnline] = useState(true);
  const netInfoRef = useRef(null);
  const mountedRef = useRef(true);
  const reachableFalseTimerRef = useRef(null);
  const foregroundGraceTimerRef = useRef(null);
  /** 이 시각 이전의 NetInfo 리스너 이벤트는 offline 확정에 쓰지 않음 */
  const ignoreNetInfoUntilRef = useRef(0);
  /** fetch 세대 — 늦은 응답이 최신 결과를 덮지 않게 */
  const fetchGenRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  /** debounce 만료 콜백에서 fetchAndApply 호출용 */
  const fetchAndApplyRef = useRef(null);

  const clearReachableFalseTimer = useCallback(() => {
    if (reachableFalseTimerRef.current) {
      clearTimeout(reachableFalseTimerRef.current);
      reachableFalseTimerRef.current = null;
    }
  }, []);

  const clearForegroundGraceTimer = useCallback(() => {
    if (foregroundGraceTimerRef.current) {
      clearTimeout(foregroundGraceTimerRef.current);
      foregroundGraceTimerRef.current = null;
    }
  }, []);

  /**
   * NetInfo state 적용.
   * @param {object|null} state
   * @param {{ immediate?: boolean, fromListener?: boolean }} options
   */
  const applyNetInfoState = useCallback(
    (state, options = {}) => {
      if (!mountedRef.current) return;

      const { immediate = false, fromListener = false } = options;

      if (
        fromListener &&
        !immediate &&
        Date.now() < ignoreNetInfoUntilRef.current
      ) {
        return;
      }

      if (!state) {
        clearReachableFalseTimer();
        setOnline(true);
        return;
      }

      // Wi-Fi/셀룰러 자체 끊김 → 즉시 offline
      if (state.isConnected === false) {
        clearReachableFalseTimer();
        setOnline(false);
        return;
      }

      // 도달 불가만 false → 디바운스 (immediate면 즉시)
      if (state.isInternetReachable === false) {
        if (immediate) {
          clearReachableFalseTimer();
          setOnline(false);
          return;
        }
        // 이미 대기 중이면 첫 false부터 2초 측정 유지
        if (reachableFalseTimerRef.current) return;
        reachableFalseTimerRef.current = setTimeout(() => {
          reachableFalseTimerRef.current = null;
          if (!mountedRef.current) return;
          fetchAndApplyRef.current?.({ immediate: true });
        }, REACHABLE_FALSE_DEBOUNCE_MS);
        return;
      }

      // online (reachable true / null 등)
      clearReachableFalseTimer();
      setOnline(true);
    },
    [clearReachableFalseTimer],
  );

  const fetchAndApply = useCallback(
    async ({ immediate = false } = {}) => {
      const gen = ++fetchGenRef.current;
      try {
        const NetInfo = netInfoRef.current ?? (await loadNetInfo());
        netInfoRef.current = NetInfo;
        const state = await NetInfo.fetch();
        if (!mountedRef.current || gen !== fetchGenRef.current) return;
        applyNetInfoState(state, { immediate, fromListener: false });
      } catch (error) {
        if (!mountedRef.current || gen !== fetchGenRef.current) return;
        console.warn('[OfflineGate] 네트워크 상태 확인 실패:', error);
        clearReachableFalseTimer();
        setOnline(true);
      }
    },
    [applyNetInfoState, clearReachableFalseTimer],
  );

  fetchAndApplyRef.current = fetchAndApply;

  /** 「다시 시도」— grace/디바운스 깨고 즉시 반영 */
  const refresh = useCallback(async () => {
    ignoreNetInfoUntilRef.current = 0;
    clearForegroundGraceTimer();
    clearReachableFalseTimer();
    await fetchAndApply({ immediate: true });
  }, [
    clearForegroundGraceTimer,
    clearReachableFalseTimer,
    fetchAndApply,
  ]);

  // NetInfo 구독
  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe = () => {};

    (async () => {
      try {
        const NetInfo = await loadNetInfo();
        if (!mountedRef.current) return;
        netInfoRef.current = NetInfo;

        const state = await NetInfo.fetch();
        if (mountedRef.current) {
          applyNetInfoState(state, { fromListener: false });
        }

        unsubscribe = NetInfo.addEventListener((next) => {
          if (mountedRef.current) {
            applyNetInfoState(next, { fromListener: true });
          }
        });
      } catch (error) {
        console.warn('[OfflineGate] NetInfo 초기화 실패:', error);
        if (mountedRef.current) setOnline(true);
      }
    })();

    return () => {
      mountedRef.current = false;
      unsubscribe();
      clearReachableFalseTimer();
      clearForegroundGraceTimer();
    };
  }, [
    applyNetInfoState,
    clearForegroundGraceTimer,
    clearReachableFalseTimer,
  ]);

  // 포그라운드 복귀: grace 후 fetch 재검사
  useEffect(() => {
    const onAppStateChange = (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      const wasBackground =
        prev === 'background' || prev === 'inactive';
      if (!wasBackground || nextState !== 'active') return;

      ignoreNetInfoUntilRef.current = Date.now() + FOREGROUND_GRACE_MS;
      clearForegroundGraceTimer();
      clearReachableFalseTimer();

      foregroundGraceTimerRef.current = setTimeout(() => {
        foregroundGraceTimerRef.current = null;
        if (!mountedRef.current) return;
        ignoreNetInfoUntilRef.current = 0;
        fetchAndApply({ immediate: false });
      }, FOREGROUND_GRACE_MS);
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      sub.remove();
      clearForegroundGraceTimer();
    };
  }, [
    clearForegroundGraceTimer,
    clearReachableFalseTimer,
    fetchAndApply,
  ]);

  if (online) return children;

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Feather name="wifi-off" size={34} color={colors.primary} />
      </View>

      <Text style={styles.title}>
        네트워크 연결 상태를{'\n'}확인해 주세요
      </Text>
      <Text style={styles.body}>
        Wi-Fi 또는 모바일 데이터가{'\n'}켜져 있는지 확인해 주세요
      </Text>

      <Pressable
        onPress={refresh}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
      >
        <Feather name="refresh-cw" size={16} color={colors.textPrimary} />
        <Text style={styles.retryText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryLight30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 30,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  retryBtnPressed: {
    backgroundColor: colors.surface,
  },
  retryText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
