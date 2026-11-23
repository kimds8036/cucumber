/**
 * 스터디 카페 — snowmap WebView (가로모드)
 * 타이머·친구는 앱 컨트롤러 브릿지로 연동한다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Dimensions,
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
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors } from '../../styles/colors';
import {
  api,
  getApiBaseUrlNoSlash,
  getAuthToken,
  refreshAccessToken,
} from '../../utils/api';
import { useMainShellOptional } from '../../context/MainShellContext';
import { setToastInterceptor } from '../../context/ToastContext';
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
import { releaseCafeBgm, setCafeBgmOn } from './cafeBgm';

async function buildSnowmapUrl() {
  const base = getApiBaseUrlNoSlash().replace(/\/+$/, '');
  const params = new URLSearchParams();
  // 웹이 처음 그릴 때부터 앱 안인지 알게 한다 (웹 로딩을 숨기고 앱 로딩 한 장만 보이게)
  params.set('inApp', '1');
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
    const quality = settings?.cafeGraphics === 'high' ? 'high' : 'low';
    params.set('quality', quality);
  } catch (err) {
    console.warn('[StudyCafe] settings load failed', err?.message || err);
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
      // 로딩은 앱이 한 장만 그린다. 웹 로딩(#status)은 숨기고 진행률만 앱에 보낸다
      try { document.documentElement.classList.add('in-app-loader'); } catch (e) {}
      true;
    })();
  `;
}

/** 세로가 될 때까지(최대 timeoutMs) 기다린다 */
async function waitForPortrait(timeoutMs = 900) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const { width, height } = Dimensions.get('window');
    if (height > width) return true;
    await new Promise((r) => setTimeout(r, 40));
  }
  return false;
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

export default function TimerAniLab({ navigation }) {
  const insets = useSafeAreaInsets();
  const shell = useMainShellOptional();
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const [snowmapUrl, setSnowmapUrl] = useState(null);
  const [authScript, setAuthScript] = useState(null);
  /** 나가는 중 (세로로 돌린 뒤 닫는다) */
  const [leaving, setLeaving] = useState(false);
  // 방명록을 보는 동안은 왼쪽 위 뒤로가기 버튼을 숨긴다 (웹이 'cafe:board'로 알려 줌)
  const [boardOpen, setBoardOpen] = useState(false);
  const leavingRef = useRef(false);
  const allowRemoveRef = useRef(false);
  // 배경음악은 들어올 때마다 꺼진 채로 시작한다. 사용자가 버튼으로 켠다
  const [bgmOn, setBgmOn] = useState(false);

  useEffect(() => () => releaseCafeBgm(), []);

  useEffect(() => {
    // 나가는 중에는 끈다
    setCafeBgmOn(bgmOn && !leaving);
  }, [bgmOn, leaving]);

  const toggleBgm = useCallback(() => {
    setBgmOn((prev) => !prev);
  }, []);

  // 스터디 카페에 있는 동안은 화면이 꺼지지 않게 한다 (타이머 화면과 같은 방식)
  useEffect(() => {
    const tag = 'youth-paper-study-cafe';
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag);
    };
  }, []);

  // 안드로이드: 가장자리 스와이프·뒤로가기 키는 무시한다. 조이스틱을 쓰다 스와이프가 뒤로가기로 인식되던 문제.
  // (스와이프와 뒤로가기 키는 구분할 수 없다. 나가기는 화면 왼쪽 위 뒤로가기 버튼으로만 한다)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

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

  /**
   * 카페에 있는 동안 앱 토스트(친구 요청 등)는 띄우지 않고 카페 화면의 알림벨로 보낸다.
   * 세로 기준 토스트가 가로 화면을 크게 덮었다. 카페가 아직 준비 전이면 모아 두었다가 준비되면 보낸다.
   */
  const pendingNoticesRef = useRef([]);
  const sendNotice = useCallback(
    (notice) => {
      if (!readyRef.current) {
        pendingNoticesRef.current.push(notice);
        if (pendingNoticesRef.current.length > 20) pendingNoticesRef.current.shift();
        return;
      }
      inject(makeBridgeMessage('app:notice', notice));
    },
    [inject],
  );
  useEffect(
    () =>
      setToastInterceptor((toast) => {
        sendNotice({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: toast.title || null,
          message: String(toast.message || ''),
          senderName: toast.senderName || null,
          body: toast.body || null,
          type: toast.type || null,
          category: toast.category || null,
          relatedType: toast.relatedType || null,
          at: Date.now(),
        });
        return true;
      }),
    [sendNotice],
  );

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
      void active;
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
        setBoardOpen(false);
        syncAll();
        // 로딩 중에 온 알림을 이제 보낸다
        const queued = pendingNoticesRef.current.splice(0);
        for (const notice of queued) inject(makeBridgeMessage('app:notice', notice));
        return;
      }

      // 로딩은 웹이 그린다. 진행률·오류 알림은 받기만 한다
      if (msg.type === 'cafe:loading' || msg.type === 'cafe:error') return;

      if (msg.type === 'cafe:board') {
        setBoardOpen(Boolean(msg.payload?.open));
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

  /**
   * 나갈 때: 세로로 돌리고, 회전과 뒤 화면 다시 그리기가 끝난 뒤에 닫는다.
   * 닫고 나서 돌리면 가로 크기로 그려져 있던 앱 화면이 잠깐 망가져 보였다.
   */
  const exitCafe = useCallback(
    async (action) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      setLeaving(true);
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch {
        // 회전 못 해도 닫기는 한다
      }
      await waitForPortrait();
      // 뒤에 깔린 화면이 세로 크기로 다시 그려질 시간
      await new Promise((r) => setTimeout(r, 160));
      allowRemoveRef.current = true;
      if (action) navigation.dispatch(action);
      else if (navigation?.canGoBack?.()) navigation.goBack();
      else shell?.navigation?.goBack?.();
    },
    [navigation, shell],
  );

  // 뒤로가기 버튼·안드로이드 뒤로가기·제스처 모두 exitCafe를 거치게 한다
  useEffect(() => {
    if (!navigation?.addListener) return undefined;
    return navigation.addListener('beforeRemove', (e) => {
      if (allowRemoveRef.current) return;
      e.preventDefault();
      exitCafe(e.data?.action);
    });
  }, [navigation, exitCafe]);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else exitCafe(null);
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden={!leaving} />
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
          // 아이폰 꾹 누르기 미리보기 메뉴를 막는다 (글자 선택·복사 메뉴는 웹 CSS에서 막음)
          allowsLinkPreview={false}
          onMessage={onWebMessage}
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
      ) : null}

      {/*
        로딩 카드는 웹(index.html #status)이 그린다. 앱(React Native)이 그리면 회전하는 동안 화면 틀이 흔들려
        카드가 위·아래로 밀렸다(덮개·Modal 모두). 웹은 자기 화면 크기를 정확히 알고, 크기가 자리 잡은 뒤에만
        카드를 보여 준다. 앱은 같은 바탕색(#151f2d)만 깔아 둔다.
      */}

      {/* 나가는 동안 회전하는 화면을 가린다 */}
      {leaving ? <View style={styles.leaveCover} pointerEvents="none" /> : null}

      {loadError ? (
        <View style={styles.errorBox} pointerEvents="box-none">
          <Text style={styles.errorText}>{loadError}</Text>
          {__DEV__ ? <Text style={styles.errorHint}>{snowmapUrl}</Text> : null}
        </View>
      ) : null}

      {boardOpen ? null : (
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
      )}

      {boardOpen ? null : (
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              top: Math.max(10, insets.top || 10),
              left: Math.max(10, insets.left || 10) + 48,
            },
          ]}
          onPress={toggleBgm}
          activeOpacity={0.85}
          accessibilityRole="switch"
          accessibilityState={{ checked: bgmOn }}
          accessibilityLabel={bgmOn ? '배경음악 끄기' : '배경음악 켜기'}
        >
          <Ionicons
            name={bgmOn ? 'musical-notes' : 'volume-mute'}
            size={20}
            color={bgmOn ? colors.white : 'rgba(255, 255, 255, 0.55)'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 웹 로딩(#status) 바탕과 같은 색. 웹이 그려지기 전·회전 중에도 경계선이 보이지 않게 한다
  root: {
    flex: 1,
    backgroundColor: '#151f2d',
  },
  webview: {
    flex: 1,
    backgroundColor: '#151f2d',
  },
  leaveCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#151f2d',
    zIndex: 30,
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
