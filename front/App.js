import { StatusBar } from 'expo-status-bar';
import { CommonActions, NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './view/src/signup/Login';
import Sign from './view/src/signup/Sign';
import IDfind from './view/src/signup/IDfind';
import PWfind from './view/src/signup/PWfind';
import MainScreen from './view/src/MainScreen';
import AddTimetable from './src/screens/timetable/TimetableScreen';
import TimetabelChoice from './src/screens/timetable/timetabelChoice';
import EditTimetable from './view/src/edittimetable';
import MyPosts from './view/src/myposts';
import NotificationSettings from './view/src/notificationsettings';
import SetPinScreen from './view/src/setPinScreen';
import ConfirmPinScreen from './view/src/confirmPinScreen';
import VerifyPinScreen from './view/src/verifyPinScreen';
import ChangePassword from './view/src/changepassword';
import ChangeSchool from './view/src/changeschool';
import SearchScreen from './view/src/searchscreen';
import NotificationScreen from './view/src/notificationscreen';
import BoardWrite from './view/src/boardWrite';
import SearchResult from './view/src/SearchResult';
import BoardDetail from './view/src/boardDetail';
import ChatRoomScreen from './view/src/chat/screens/ChatRoomScreen';
import DMChatScreen from './view/src/chat/screens/DMChatScreen';
import SendMailScreen from './view/src/sendmailscreen';
import AnonymousMailScreen from './view/src/mailscreen';
import MailReplyScreen from './view/src/mailreply';
import MailHistoryScreen from './view/src/history';
import SchoolMailboxScreen from './view/src/schoolMailbox';
import SchoolMailDetail from './view/src/schoolMailDetail';
import SendSchoolMailScreen from './view/src/sendSchoolMailScreen';
import SchoolBoardAll from './view/src/schoolBoardAll';
import OtherSchoolScreen from './view/src/otherschool';
import MealCalender from './view/src/mealcalender';
import Timer from './view/src/timer';
import FriendsScreen from './view/src/friendsscreen';
import HiddenPostsAppeals from './view/src/hiddenPostsAppeals';
import Inquiry from './view/src/Inquiry';
import InAppInquiry from './view/src/InAppInquiry';
import Info from './view/src/info';
// import TestLogin from './view/src/TestLogin'; // 테스트 로그인 화면 — 운영 진입에서는 미사용
import Announcement from './view/src/announcement';
import ServiceTermsOfService from './src/screens/Terms-of-Service/ServiceTermsOfService';
import PrivacyPolicy from './src/screens/Terms-of-Service/PrivacyPolicy';
import YouthProtectionPolicy from './src/screens/Terms-of-Service/YouthProtectionPolicy';
import OpenSourceLicenses from './src/screens/Terms-of-Service/OpenSourceLicenses';
import CommunityGuide from './src/screens/Terms-of-Service/CommunityGuide';
import GuideOverlayScreen from './src/screens/UserGuide/GuideOverlayScreen';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLockProvider } from './context/AppLockContext';
import { LocationProvider, LocationGate } from './context/LocationContext';
import StudentVerificationGate from './components/auth/StudentVerificationGate';
import StudentVerificationRejected from './components/auth/StudentVerificationRejected';
import AccountBlockedScreen from './components/auth/AccountBlockedScreen';
import ReverificationGate from './components/auth/ReverificationGate';
import ReverificationReminderBanner from './components/auth/ReverificationReminderBanner';
import ReverificationPendingBanner from './components/auth/ReverificationPendingBanner';
import ForceUpdateGate from './components/common/ForceUpdateGate';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import StudentIdResubmit from './view/src/signup/StudentIdResubmit';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { FriendProvider } from './context/FriendContext';
import { ToastProvider } from './context/ToastContext';
import ToastHost from './components/common/ToastHost';
import AlertHost from './components/common/AlertHost';
import { navigationRef } from './navigation/navigationRef';
import { getPendingInicisSession } from './services/inicisAuth';
import {
  navigateFromPush,
  resolvePushNavigation,
} from './navigation/pushNavigation';
import { colors } from './styles/colors';
import { appAlert } from './utils/appAlert';
import {
  cancelTimerRunningNotification,
  configureTimerNotificationHandler,
  hasTimerRunningNotification,
  showTimerRunningNotification,
} from './utils/timerRunNotification';
import { getTimerRuntimeState } from './utils/timerRuntimeStore';
import {
  getInitialFCMNotification,
  initFCM,
  setupFCMHandlers,
} from './utils/fcmService';
import { trackScreenView, flushAnalyticsEvents } from './utils/analytics';
import { ROUTE_TO_ANALYTICS_SCREEN } from './constants/analyticsScreens';

const Stack = createNativeStackNavigator();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
  },
};
const linking = {
  prefixes: ['cucumber://', 'youthpaper://', 'exp+youth-paper://'],
  config: {
    screens: {
      BoardDetail: 'board/:postId',
      Sign: 'inicis/return',
    },
  },
};

function getActiveRouteName(state) {
  if (!state?.routes?.length) return null;
  const route = state.routes[state.index ?? 0];
  if (route?.state) return getActiveRouteName(route.state);
  return route?.name || null;
}

function trackNavigationScreen(routeName) {
  if (!routeName || routeName === 'Main') return;
  const screen = ROUTE_TO_ANALYTICS_SCREEN[routeName];
  if (screen) trackScreenView(screen);
}

SplashScreen.preventAutoHideAsync();

// ---------- Auth Flow: 로그인 상태에 따른 스택 분리 (선언적 내비게이션) ----------
// 비로그인 시 Auth 스택만, 로그인 시 Main 스택만 렌더링하여
// "로그인 후 뒤로가기 시 다시 로그인 창" 문제를 근본적으로 방지합니다.
// 로그아웃 시: 화면 어디서든 useAuth().logout() 호출하면 로그인 스택으로 전환됩니다.

function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      {/* <Stack.Screen name="TestLogin" component={TestLogin} /> */}
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Sign" component={Sign} />
      <Stack.Screen name="IDfind" component={IDfind} />
      <Stack.Screen name="PWfind" component={PWfind} />
      <Stack.Screen name="Inquiry" component={Inquiry} />
    </Stack.Navigator>
  );
}

function MainStack({ initialRouteName = 'Main' }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen name="BoardWrite" component={BoardWrite} />
      <Stack.Screen name="BoardDetail" component={BoardDetail} />
      <Stack.Screen name="Chat" component={ChatRoomScreen} />
      <Stack.Screen name="DMChat" component={DMChatScreen} />
      <Stack.Screen name="TimetabelChoice" component={TimetabelChoice} />
      <Stack.Screen name="AddTimetable" component={AddTimetable} />
      <Stack.Screen name="EditTimetable" component={EditTimetable} />
      <Stack.Screen name="MyPosts" component={MyPosts} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
      />
      <Stack.Screen name="SetPinScreen" component={SetPinScreen} />
      <Stack.Screen name="ConfirmPinScreen" component={ConfirmPinScreen} />
      <Stack.Screen name="VerifyPinScreen" component={VerifyPinScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="ChangeSchool" component={ChangeSchool} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
      <Stack.Screen name="SendMail" component={SendMailScreen} />
      <Stack.Screen name="MailDetail" component={AnonymousMailScreen} />
      <Stack.Screen name="MailReply" component={MailReplyScreen} />
      <Stack.Screen name="MailHistory" component={MailHistoryScreen} />
      <Stack.Screen name="SchoolBoardAll" component={SchoolBoardAll} />
      <Stack.Screen name="SchoolMailbox" component={SchoolMailboxScreen} />
      <Stack.Screen name="SchoolMailDetail" component={SchoolMailDetail} />
      <Stack.Screen name="SendSchoolMail" component={SendSchoolMailScreen} />
      <Stack.Screen name="Timer" component={Timer} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="HiddenPostsAppeals" component={HiddenPostsAppeals} />
      <Stack.Screen name="Inquiry" component={Inquiry} />
      <Stack.Screen name="InAppInquiry" component={InAppInquiry} />
      <Stack.Screen name="Info" component={Info} />
      <Stack.Screen name="Announcement" component={Announcement} />
      <Stack.Screen
        name="ServiceTermsOfService"
        component={ServiceTermsOfService}
      />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Stack.Screen
        name="YouthProtectionPolicy"
        component={YouthProtectionPolicy}
      />
      <Stack.Screen name="OpenSourceLicenses" component={OpenSourceLicenses} />
      <Stack.Screen name="CommunityGuide" component={CommunityGuide} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="SearchResult" component={SearchResult} />
      <Stack.Screen name="OtherSchool" component={OtherSchoolScreen} />
      <Stack.Screen name="MealCalendar" component={MealCalender} />
      <Stack.Screen
        name="GuideOverlay"
        component={GuideOverlayScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const {
    isLoggedIn,
    authHydrated,
    postLoginRoute,
    setPostLoginRoute,
    studentVerificationStatus,
    reverificationStatus,
    reverificationDeadline,
    reverificationSubmissionPending,
    refreshStudentVerification,
  } = useAuth();
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitMode, setResubmitMode] = useState('rejected');
  const pollRef = useRef(null);

  useEffect(() => {
    if (!authHydrated || isLoggedIn) return undefined;
    let cancelled = false;
    (async () => {
      const pending = await getPendingInicisSession();
      if (!pending || cancelled) return;
      const tryNavigate = () => {
        if (!navigationRef.isReady()) return false;
        const route = navigationRef.getCurrentRoute?.();
        if (route?.name !== 'Sign') {
          navigationRef.navigate('Sign');
        }
        return true;
      };
      if (!tryNavigate()) {
        const timer = setInterval(() => {
          if (tryNavigate()) clearInterval(timer);
        }, 150);
        return () => clearInterval(timer);
      }
      return undefined;
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (postLoginRoute !== 'Main') {
      setPostLoginRoute('Main');
    }
  }, [isLoggedIn, postLoginRoute, setPostLoginRoute]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    refreshStudentVerification();
    pollRef.current = setInterval(() => {
      refreshStudentVerification();
    }, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLoggedIn, refreshStudentVerification]);

  const navigateViaMainEntry = ({ name, params, relatedType }) => {
    navigateFromPush({ name, params, relatedType });
  };

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) return undefined;

    let cleanup;
    const handleNotificationOpened = (remoteMessage) => {
      const data = remoteMessage?.data || {};
      if (!navigationRef.isReady()) return;
      const { name, params } = resolvePushNavigation(data, remoteMessage);
      if (!name) return;
      navigateViaMainEntry({
        name,
        params,
        relatedType: String(data?.relatedType || '').trim(),
      });
    };

    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[Notification] 알림 권한이 허용되지 않았습니다:', status);
          return;
        }
      } catch (error) {
        console.warn('[Notification] 권한 요청 실패:', error?.message ?? error);
        return;
      }

      await initFCM();
      cleanup = setupFCMHandlers({
        onNotificationOpened: handleNotificationOpened,
      });

      const initialMessage = await getInitialFCMNotification();
      if (initialMessage) {
        console.log('[FCM] 종료 상태에서 알림 탭으로 앱 오픈:', initialMessage);
        handleNotificationOpened(initialMessage);
      }
    })();

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [isLoggedIn]);

  if (!authHydrated) return null;

  if (!isLoggedIn) return <AuthStack />;

  if (showResubmit) {
    return (
      <StudentIdResubmit
        mode={resubmitMode}
        navigation={{ goBack: () => setShowResubmit(false) }}
      />
    );
  }

  if (
    studentVerificationStatus === 'PENDING' &&
    !reverificationSubmissionPending
  ) {
    return <StudentVerificationGate />;
  }

  if (studentVerificationStatus === 'REJECTED') {
    return (
      <StudentVerificationRejected
        onResubmit={() => {
          setResubmitMode('rejected');
          setShowResubmit(true);
        }}
      />
    );
  }

  if (reverificationStatus === 'graduated_blocked') {
    return <AccountBlockedScreen variant="graduated" />;
  }

  if (reverificationStatus === 'adult_blocked') {
    return <AccountBlockedScreen variant="adult" />;
  }

  if (reverificationStatus === 'restricted') {
    return (
      <ReverificationGate
        onResubmit={() => {
          setResubmitMode('reverification');
          setShowResubmit(true);
        }}
      />
    );
  }

  const showReverificationPendingBanner = reverificationSubmissionPending;
  const showReverificationBanner =
    !showReverificationPendingBanner &&
    (reverificationStatus === 'grace' || reverificationStatus === 'required');

  const mainInitialRoute =
    postLoginRoute === 'GuideOverlay' ? 'GuideOverlay' : 'Main';
  return (
    <View style={{ flex: 1 }}>
      {showReverificationPendingBanner ? <ReverificationPendingBanner /> : null}
      {showReverificationBanner ? (
        <ReverificationReminderBanner
          status={reverificationStatus}
          deadline={reverificationDeadline}
          onResubmit={() => {
            setResubmitMode('reverification');
            setShowResubmit(true);
          }}
        />
      ) : null}
      <LocationGate>
        <MainStack initialRouteName={mainInitialRoute} />
      </LocationGate>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Baloo2-Regular': require('./assets/fonts/Baloo2-Regular.ttf'),
    'Baloo2-Bold': require('./assets/fonts/Baloo2-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const originalAlert = Alert.alert;
    appAlert.setNativeAlert(originalAlert);
    Alert.alert = (...args) => appAlert.alert(...args);
    return () => {
      Alert.alert = originalAlert;
    };
  }, []);

  const lastHandledTimerNotificationRef = useRef(null);
  const lastHandledTimerNotificationAtRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const backgroundRetryTimerRef = useRef(null);
  const lastBackgroundAtRef = useRef(0);
  const TIMER_NOTIFICATION_HANDLE_WINDOW_MS = 4000;
  const logTimerBg = (event, payload = {}) => {
    if (!__DEV__) return;
    console.log(`[TimerBG][${event}]`, {
      at: new Date().toISOString(),
      appState: appStateRef.current,
      ...payload,
    });
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const RNStatusBar = require('react-native').StatusBar;
    RNStatusBar.setBackgroundColor(colors.background, true);
    RNStatusBar.setBarStyle('dark-content', true);
    return undefined;
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        flushAnalyticsEvents();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log(
        '[Notification] Expo Go 환경에서는 원격 푸시 기능을 초기화하지 않습니다.',
      );
      return undefined;
    }

    configureTimerNotificationHandler();
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const targetScreen =
          response?.notification?.request?.content?.data?.targetScreen;
        const responseId = response?.notification?.request?.identifier ?? null;
        if (targetScreen === 'Timer' && navigationRef.isReady()) {
          const currentRouteBefore = navigationRef.getCurrentRoute?.();
          if (__DEV__) {
            console.log('[TimerNotifNav][response_received]', {
              at: new Date().toISOString(),
              appState: appStateRef.current,
              targetScreen,
              responseId,
              currentRouteName: currentRouteBefore?.name ?? null,
              currentRouteKey: currentRouteBefore?.key ?? null,
              sinceBackgroundMs: Date.now() - lastBackgroundAtRef.current,
            });
          }
          const sinceBgMs = Date.now() - lastBackgroundAtRef.current;
          // stale 응답(이미 포그라운드에서 다른 화면 이동 중 뒤늦게 도착) 차단
          if (
            appStateRef.current === 'active' &&
            sinceBgMs > TIMER_NOTIFICATION_HANDLE_WINDOW_MS
          ) {
            if (__DEV__) {
              console.log('[TimerNotifNav][response_ignored_stale]', {
                at: new Date().toISOString(),
                appState: appStateRef.current,
                responseId,
                sinceBackgroundMs: sinceBgMs,
                handleWindowMs: TIMER_NOTIFICATION_HANDLE_WINDOW_MS,
              });
            }
            return;
          }
          const now = Date.now();
          // 알림 탭 처리 직후 발생하는 중복/지연 응답으로 인한 재-reset 방지
          if (now - lastHandledTimerNotificationAtRef.current < 1500) {
            if (__DEV__) {
              console.log('[TimerNotifNav][response_ignored_cooldown]', {
                at: new Date().toISOString(),
                appState: appStateRef.current,
                responseId,
                diffMs: now - lastHandledTimerNotificationAtRef.current,
              });
            }
            return;
          }
          // 동일 알림 응답 중복 전달/중복 탭 방지
          if (
            responseId &&
            lastHandledTimerNotificationRef.current === responseId
          ) {
            if (__DEV__) {
              console.log('[TimerNotifNav][response_ignored_duplicate_id]', {
                at: new Date().toISOString(),
                responseId,
              });
            }
            return;
          }
          if (responseId) {
            lastHandledTimerNotificationRef.current = responseId;
          }
          lastHandledTimerNotificationAtRef.current = now;
          const currentRoute = navigationRef.getCurrentRoute?.();
          if (currentRoute?.name === 'Timer') {
            if (__DEV__) {
              console.log('[TimerNotifNav][response_ignored_already_timer]', {
                at: new Date().toISOString(),
                responseId,
                currentRouteName: currentRoute?.name ?? null,
              });
            }
            return;
          }
          if (__DEV__) {
            console.log('[TimerNotifNav][dispatch_reset_to_timer]', {
              at: new Date().toISOString(),
              responseId,
              currentRouteName: currentRoute?.name ?? null,
            });
          }
          navigateFromPush({
            name: 'Main',
            params: { initialTab: 'timer' },
            relatedType: '',
          });
          Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
        }
      },
    );
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      logTimerBg('appstate_change', { prevState, nextState });

      if (backgroundRetryTimerRef.current) {
        clearTimeout(backgroundRetryTimerRef.current);
        backgroundRetryTimerRef.current = null;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        lastBackgroundAtRef.current = Date.now();
        const runtime = getTimerRuntimeState();
        logTimerBg('background_enter', {
          runtimeRunning: Boolean(runtime?.isRunning),
        });
        if (runtime?.isRunning) {
          logTimerBg('show_request_primary');
          showTimerRunningNotification();
          // 간헐적 AppState 경계 누락 보정: 짧은 지연 후 1회 재확인
          backgroundRetryTimerRef.current = setTimeout(async () => {
            backgroundRetryTimerRef.current = null;
            if (appStateRef.current === 'active') return;
            const latestRuntime = getTimerRuntimeState();
            if (!latestRuntime?.isRunning) return;
            const exists = await hasTimerRunningNotification();
            logTimerBg('show_retry_check', {
              runtimeRunning: Boolean(latestRuntime?.isRunning),
              exists,
            });
            if (!exists) {
              logTimerBg('show_request_retry');
              showTimerRunningNotification();
            }
          }, 700);
        } else {
          logTimerBg('cancel_request_not_running');
          cancelTimerRunningNotification();
        }
        return;
      }

      if (prevState.match(/inactive|background/) && nextState === 'active') {
        logTimerBg('foreground_enter_cancel');
        cancelTimerRunningNotification();
      }
    });
    return () => {
      if (backgroundRetryTimerRef.current) {
        clearTimeout(backgroundRetryTimerRef.current);
        backgroundRetryTimerRef.current = null;
      }
      sub.remove();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <ForceUpdateGate>
        <KeyboardProvider>
          <AuthProvider>
            <AppLockProvider>
              <LocationProvider>
                <SocketProvider>
                  <ToastProvider>
                    <NotificationProvider>
                      <FriendProvider>
                        <NavigationContainer
                          ref={navigationRef}
                          linking={linking}
                          theme={navigationTheme}
                          onStateChange={(state) => {
                            trackNavigationScreen(getActiveRouteName(state));
                          }}
                        >
                          <AppErrorBoundary>
                            <RootNavigator />
                          </AppErrorBoundary>
                          <ToastHost />
                          <AlertHost />
                        </NavigationContainer>
                      </FriendProvider>
                    </NotificationProvider>
                  </ToastProvider>
                </SocketProvider>
              </LocationProvider>
            </AppLockProvider>
          </AuthProvider>
        </KeyboardProvider>
      </ForceUpdateGate>
    </SafeAreaProvider>
  );
}
