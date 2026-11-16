/**
 * 스터디 카페 — snowmap WebView (가로모드)
 * 타이머·친구는 앱 컨트롤러 브릿지로 연동한다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
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
import {
  api,
  getApiBaseUrlNoSlash,
  getAuthToken,
  refreshAccessToken,
} from '../../utils/api';
import { useMainShellOptional } from '../../context/MainShellContext';
import { loadTimerSettings } from './timer/timerSettingsStorage';
import {
  buildFriendListMessage,
  buildInjectBridgeScript,
  buildTimerSnapshotMessage,
  getStudyCafeController,
  handleStudyCafeIncoming,
  makeBridgeMessage,
  parseBridgeMessage,
  subscribeStudyCafeController,
  subscribeStudyCafeSnapshot,
} from '../../utils/studyCafeBridge';

async function buildSnowmapUrl() {
  const base = getApiBaseUrlNoSlash().replace(/\/+$/, '');
  const params = new URLSearchParams();
  try {
    const res = await api.get('/api/auth/me');
    const me = res.data?.data;
    if (me?.id != null) params.set('userId', String(me.id));
    const username = String(me?.username || '').trim();
    if (username) params.set('displayName', username);
    const avatar =
      me?.avatarUrl || me?.avatar_url || me?.profileImageUrl || '';
    if (avatar) params.set('avatarUrl', String(avatar));
  } catch (err) {
    console.warn('[StudyCafe] identity load failed', err?.message || err);
  }
  try {
    const settings = await loadTimerSettings();
    const gender = settings?.gender === 'girl' ? 'girl' : 'boy';
    params.set('gender', gender);
  } catch (err) {
    console.warn('[StudyCafe] gender load failed', err?.message || err);
  }
  const query = params.toString();
  return query ? `${base}/snowmap/?${query}` : `${base}/snowmap/`;
}

/**
 * 카페 페이지가 뜨기 전에 로그인 토큰을 넣는다 (서버 소켓·방명록 API 인증용).
 * 토큰은 URL에 싣지 않는다 — 주소는 로그·에러 화면에 남을 수 있다.
 */
function buildAuthInjectScript(token) {
  const json = JSON.stringify(JSON.stringify({ token: token || null }));
  return `
    (function(){
      try { window.__STUDY_CAFE_AUTH__ = JSON.parse(${json}); } catch (e) {}
      true;
    })();
  `;
}

/**
 * 주소를 { host, path }로 나눈다. 호스트는 소문자, 기본 포트(:80/:443)는 뺀다.
 * RN의 URL 구현은 기기마다 차이가 있어 정규식으로 직접 나눈다.
 */
function splitUrl(url) {
  const m = /^(https?):\/\/([^/?#]+)([^?#]*)/i.exec(String(url || '').trim());
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  let host = m[2].toLowerCase();
  if ((scheme === 'https' && host.endsWith(':443')) || (scheme === 'http' && host.endsWith(':80'))) {
    host = host.replace(/:\d+$/, '');
  }
  return { host, path: m[3] || '/' };
}

/**
 * 카페 페이지(같은 서버의 /snowmap)인지. 토큰이 다른 페이지에 들어가지 않게 이동·메시지를 막는 데 쓴다.
 * 문자열 앞부분 비교(startsWith)는 기기가 주소를 조금만 다르게 넘겨도(대소문자·포트·http/https)
 * 카페 메시지를 전부 버려 앱 타이머와 연결이 끊겼다. 호스트와 경로만 비교한다.
 */
function isSnowmapUrl(url) {
  if (String(url || '') === 'about:blank') return true;
  const page = splitUrl(url);
  const base = splitUrl(getApiBaseUrlNoSlash());
  if (!page || !base) return false;
  return page.host === base.host && /^\/snowmap(\/|$)/.test(page.path);
}

/**
 * 메시지를 보낸 페이지가 우리 서버인지.
 * 안드로이드는 onMessage의 url로 경로 없이 출처(https://도메인)만 넘긴다. 그래서 메시지는 도메인만 본다.
 * 페이지 이동은 isSnowmapUrl로 /snowmap 밖을 막고 있으니, 같은 도메인의 다른 페이지가 열릴 일은 없다.
 */
function isCafeMessageOrigin(url) {
  const page = splitUrl(url);
  const base = splitUrl(getApiBaseUrlNoSlash());
  if (!page || !base) return false;
  return page.host === base.host;
}

async function fetchFriendListForCafe() {
  try {
    const res = await api.get('/api/friends/list');
    const list = res.data?.data ?? [];
    return (Array.isArray(list) ? list : []).map((f) => ({
      id: f.userId,
      userId: f.userId,
      username: String(f.username || '').replace(/^@/, ''),
      nickname: f.name || f.username || '',
      avatarUrl: f.avatarUrl || f.avatar_url || null,
    }));
  } catch (err) {
    console.warn('[StudyCafe] friends load failed', err?.message || err);
    return [];
  }
}

/**
 * 앱이 그리는 로딩 카드. 카페 웹페이지(index.html #status)의 첫 화면과 모양·크기·문구를 똑같이 맞춰
 * 앱 로딩 → 웹 로딩으로 넘어갈 때 위치가 튀지 않게 한다.
 */
function CafeLoadingCard() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 750,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.loading} pointerEvents="none">
      <View style={styles.loadingCard}>
        <Animated.View style={[styles.loadingSpinner, { transform: [{ rotate }] }]} />
        <Text style={styles.loadingText}>준비 중</Text>
        <View style={styles.loadingBar}>
          <View style={styles.loadingFill} />
        </View>
      </View>
    </View>
  );
}

export default function TimerAniLab({ navigation }) {
  const insets = useSafeAreaInsets();
  const shell = useMainShellOptional();
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const [snowmapUrl, setSnowmapUrl] = useState(null);
  const [authScript, setAuthScript] = useState(null);
  /** 가로 고정이 끝난 뒤에 로딩을 그린다 (세로로 그렸다가 돌아가며 위치가 튀지 않게) */
  const [orientationReady, setOrientationReady] = useState(false);

  const inject = useCallback((message) => {
    const ref = webRef.current;
    if (!ref || !message) return;
    try {
      ref.injectJavaScript(buildInjectBridgeScript(message));
    } catch (err) {
      console.warn('[StudyCafe] inject failed', err?.message || err);
    }
  }, []);

  const pushSnapshot = useCallback(() => {
    const ctrl = getStudyCafeController();
    if (!ctrl?.getSnapshot) return;
    inject(buildTimerSnapshotMessage(ctrl.getSnapshot()));
  }, [inject]);

  const pushFriends = useCallback(async () => {
    const ctrl = getStudyCafeController();
    let friends = [];
    if (ctrl?.listFriends) {
      try {
        friends = await ctrl.listFriends();
      } catch {
        friends = await fetchFriendListForCafe();
      }
    } else {
      friends = await fetchFriendListForCafe();
    }
    inject(buildFriendListMessage(friends));
  }, [inject]);

  const syncAll = useCallback(() => {
    pushSnapshot();
    pushFriends();
  }, [pushFriends, pushSnapshot]);

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
      if (active) setOrientationReady(true);
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
      const [url, token] = await Promise.all([
        buildSnowmapUrl(),
        getAuthToken().catch(() => null),
      ]);
      if (cancelled) return;
      setAuthScript(buildAuthInjectScript(token));
      setSnowmapUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeStudyCafeController(() => {
      if (readyRef.current) syncAll();
    });
    return unsub;
  }, [syncAll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && readyRef.current) syncAll();
    });
    return () => sub.remove();
  }, [syncAll]);

  // 앱 타이머가 바뀌면 바로 보낸다 (정지·뽀모도로 전환 포함)
  useEffect(() => {
    const unsub = subscribeStudyCafeSnapshot(() => {
      if (readyRef.current) pushSnapshot();
    });
    return unsub;
  }, [pushSnapshot]);

  // 놓친 변화가 있어도 맞춰지도록 5초마다 한 번 (실행 중이 아니어도)
  useEffect(() => {
    const timer = setInterval(() => {
      if (readyRef.current) pushSnapshot();
    }, 5000);
    return () => clearInterval(timer);
  }, [pushSnapshot]);

  // 카페를 나가면 카페에서만 고른 과목을 버린다
  useEffect(
    () => () => {
      getStudyCafeController()?.resetSession?.();
    },
    [],
  );

  const onWebMessage = useCallback(
    async (event) => {
      // 카페 페이지에서 온 메시지만 받는다
      const fromUrl = event?.nativeEvent?.url;
      if (fromUrl && !isCafeMessageOrigin(fromUrl)) {
        if (__DEV__) {
          console.warn('[StudyCafe] 카페 밖 주소의 메시지를 버림', {
            fromUrl,
            apiBase: getApiBaseUrlNoSlash(),
          });
        }
        return;
      }
      const msg = parseBridgeMessage(event?.nativeEvent?.data);
      if (!msg) return;

      if (msg.type === 'bridge:ready') {
        readyRef.current = true;
        syncAll();
        return;
      }

      // 카페 서버 토큰이 만료됐을 때 새 토큰을 준다
      if (msg.type === 'auth:refresh') {
        let token = null;
        try {
          token = (await refreshAccessToken()) || (await getAuthToken());
        } catch {
          token = null;
        }
        inject(
          makeBridgeMessage(
            'auth:token',
            { replyTo: msg.id, ok: !!token, token: token || null },
            msg.id,
          ),
        );
        return;
      }

      const reply = await handleStudyCafeIncoming(msg);
      if (reply) inject(reply);
      // 최신 타이머 상태는 TimerContent가 바뀐 뒤 subscribeStudyCafeSnapshot으로 보낸다
    },
    [inject, syncAll],
  );

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else shell?.navigation?.goBack?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {snowmapUrl ? (
        <WebView
          ref={webRef}
          source={{ uri: snowmapUrl }}
          injectedJavaScriptBeforeContentLoaded={authScript || undefined}
          style={styles.webview}
          originWhitelist={['https://*', 'http://*']}
          onShouldStartLoadWithRequest={(req) => {
            const ok = isSnowmapUrl(req?.url);
            if (!ok && __DEV__) {
              console.warn('[StudyCafe] 카페 밖 주소로 이동 막음', req?.url);
            }
            return ok;
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          startInLoadingState
          onMessage={onWebMessage}
          renderLoading={() => <CafeLoadingCard />}
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
      ) : orientationReady ? (
        <CafeLoadingCard />
      ) : (
        <View style={styles.loading} />
      )}

      {loadError ? (
        <View style={styles.errorBox} pointerEvents="box-none">
          <Text style={styles.errorText}>{loadError}</Text>
          {__DEV__ ? <Text style={styles.errorHint}>{snowmapUrl}</Text> : null}
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
  // 아래 loading* 값은 back/snowmap/index.html 의 #status 와 같게 둔다
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // #1a2433 위에 rgba(20, 30, 44, 0.92) 오버레이를 얹은 색
    backgroundColor: '#151f2d',
  },
  loadingCard: {
    width: 280,
    maxWidth: '86%',
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 18, 28, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 28,
    height: 28,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: '#9fd0ff',
  },
  loadingText: {
    color: '#e8eef5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingBar: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  loadingFill: {
    width: '8%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#6ea8ff',
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
