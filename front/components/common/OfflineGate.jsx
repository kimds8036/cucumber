import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts } from '../../styles/colors';

function isOnlineFromState(state) {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

async function loadNetInfo() {
  const mod = await import('@react-native-community/netinfo');
  return mod.default;
}

export default function OfflineGate({ children }) {
  const [online, setOnline] = useState(true);
  const netInfoRef = useRef(null);

  const applyState = useCallback((state) => {
    setOnline(isOnlineFromState(state));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const NetInfo = netInfoRef.current ?? (await loadNetInfo());
      netInfoRef.current = NetInfo;
      const state = await NetInfo.fetch();
      applyState(state);
    } catch (error) {
      console.warn('[OfflineGate] 네트워크 상태 확인 실패:', error);
      setOnline(true);
    }
  }, [applyState]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    (async () => {
      try {
        const NetInfo = await loadNetInfo();
        if (!mounted) return;
        netInfoRef.current = NetInfo;

        const state = await NetInfo.fetch();
        if (mounted) applyState(state);

        unsubscribe = NetInfo.addEventListener((next) => {
          if (mounted) applyState(next);
        });
      } catch (error) {
        console.warn('[OfflineGate] NetInfo 초기화 실패:', error);
        if (mounted) setOnline(true);
      }
    })();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applyState]);

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
