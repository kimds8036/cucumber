/**
 * 스터디 카페 — snowmap WebView (가로모드)
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { colors } from '../../styles/colors';
import { api, getApiBaseUrlNoSlash } from '../../utils/api';
import { useMainShellOptional } from '../../context/MainShellContext';

async function buildSnowmapUrl() {
  const base = getApiBaseUrlNoSlash().replace(/\/+$/, '');
  const params = new URLSearchParams();
  try {
    const res = await api.get('/api/auth/me');
    const me = res.data?.data;
    if (me?.id != null) params.set('userId', String(me.id));
    const username = String(me?.username || '').trim();
    if (username) params.set('displayName', username);
  } catch (err) {
    console.warn('[StudyCafe] identity load failed', err?.message || err);
  }
  const query = params.toString();
  return query ? `${base}/snowmap/?${query}` : `${base}/snowmap/`;
}

export default function TimerAniLab({ navigation }) {
  const insets = useSafeAreaInsets();
  const shell = useMainShellOptional();
  const [loadError, setLoadError] = useState(null);
  const [snowmapUrl, setSnowmapUrl] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      } catch (err) {
        console.warn('[StudyCafe] landscape lock failed', err?.message);
      }
    })();
    return () => {
      active = false;
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => {});
      void active;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await buildSnowmapUrl();
      if (!cancelled) setSnowmapUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else shell?.navigation?.goBack?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {snowmapUrl ? (
        <WebView
          source={{ uri: snowmapUrl }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.loadingText}>맵 불러오는 중…</Text>
            </View>
          )}
          onError={(event) => {
            setLoadError(event?.nativeEvent?.description || '맵을 열 수 없어요');
          }}
          onHttpError={(event) => {
            const code = event?.nativeEvent?.statusCode;
            if (code >= 400) {
              setLoadError(`맵 서버 응답 ${code}`);
            }
          }}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>맵 불러오는 중…</Text>
        </View>
      )}

      {loadError ? (
        <View style={styles.errorBox} pointerEvents="box-none">
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.errorHint}>{snowmapUrl}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.backBtn,
          {
            top: Math.max(10, insets.top || 10),
            left: Math.max(10, insets.left || 10),
          },
        ]}
        onPress={goBack}
        activeOpacity={0.85}
        accessibilityLabel="뒤로가기"
      >
        <Ionicons name="chevron-back" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a2433',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a2433',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2433',
    gap: 12,
  },
  loadingText: {
    color: colors.white,
    fontSize: 14,
  },
  errorBox: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 18, 28, 0.88)',
  },
  errorText: {
    color: '#ffb4b4',
    fontSize: 13,
    fontWeight: '600',
  },
  errorHint: {
    marginTop: 4,
    color: 'rgba(232, 238, 245, 0.7)',
    fontSize: 11,
  },
  backBtn: {
    position: 'absolute',
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 18, 28, 0.72)',
  },
});
