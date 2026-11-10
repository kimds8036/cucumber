/**
 * 스터디룸 — snowmap WebView (가로모드)
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { getApiBaseUrlNoSlash } from '../../utils/api';
import { useMainShellOptional } from '../../context/MainShellContext';

export default function TimerAniLab({ navigation }) {
  const insets = useSafeAreaInsets();
  const shell = useMainShellOptional();
  const [loadError, setLoadError] = useState(null);

  const snowmapUrl = useMemo(() => {
    const base = getApiBaseUrlNoSlash().replace(/\/+$/, '');
    return `${base}/snowmap/`;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      } catch (err) {
        console.warn('[StudyRoom3D] landscape lock failed', err?.message);
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

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else shell?.navigation?.goBack?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
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
