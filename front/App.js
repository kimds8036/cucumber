import { StatusBar } from 'expo-status-bar';
import { CommonActions, NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './view/src/signup/Login';
import Sign from './view/src/signup/Sign';
import SignupEntry from './view/src/signup/SignupEntry';
import SignKakao from './view/src/signup/SignKakao';
import SignApple from './view/src/signup/SignApple';
import SignPhone from './view/src/signup/SignPhone';
import SignProfileUsername from './view/src/signup/SignProfileUsername';
import IDfind from './view/src/signup/IDfind';
import PWfind from './view/src/signup/PWfind';
import MainScreen from './view/src/MainScreen';
import AddTimetable from './src/screens/timetable/TimetableScreen';
import TimetabelChoice from './src/screens/timetable/timetabelChoice';
import EditTimetable from './view/src/edittimetable';
import MyPosts from './view/src/myposts';
import NotificationSettings from './view/src/notificationsettings';
import PeriodTimeSettings from './view/src/PeriodTimeSettings';
import PeriodTimeSetup from './view/src/PeriodTimeSetup';
import SetPinScreen from './view/src/setPinScreen';
import ConfirmPinScreen from './view/src/confirmPinScreen';
import VerifyPinScreen from './view/src/verifyPinScreen';
import ChangePassword from './view/src/changepassword';
import BadgeManage from './view/src/badgeManage';
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
import DeveloperWhack from './view/src/DeveloperWhack';
import Inquiry from './view/src/Inquiry';
import InAppInquiry from './view/src/InAppInquiry';
import MyInquiries from './view/src/MyInquiries';
import InquiryDetail from './view/src/InquiryDetail';
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
import { Alert, AppState, Linking, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLockProvider } from './context/AppLockContext';
import { LocationProvider, LocationGate } from './context/LocationContext';
import StudentVerificationGate from './components/auth/StudentVerificationGate';
import StudentVerificationRejected from './components/auth/StudentVerificationRejected';
import CertificateResubmit from './view/src/signup/CertificateResubmit';
import CertificateGuideResubmit from './view/src/signup/CertificateGuideResubmit';
import AltVerifyChoiceResubmit from './view/src/signup/AltVerifyChoiceResubmit';
import NeisPlusResubmit from './view/src/signup/NeisPlusResubmit';
import AccountBlockedScreen from './components/auth/AccountBlockedScreen';
import ReverificationGate from './components/auth/ReverificationGate';
import ReverificationReminderBanner from './components/auth/ReverificationReminderBanner';
import ReverificationPendingBanner from './components/auth/ReverificationPendingBanner';
import ForceUpdateGate from './components/common/ForceUpdateGate';
import OfflineGate from './components/common/OfflineGate';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import LaunchAdModal from './components/ads/LaunchAdModal';
import SplashAd from './components/ads/SplashAd';
import StudentIdResubmit from './view/src/signup/StudentIdResubmit';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { FriendProvider } from './context/FriendContext';
import { ToastProvider } from './context/ToastContext';
import ToastHost from './components/common/ToastHost';
import AlertHost from './components/common/AlertHost';
import { navigationRef } from './navigation/navigationRef';
import { getPendingInicisSession } from './services/inicisAuth';
import { getSignupPendingSession } from './view/src/signup/signupSessionStorage';
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
import WidgetDeepLinkHandler, {
  stashWidgetDeepLinkFromUrl,
} from './components/navigation/WidgetDeepLinkHandler';
import InviteDeepLinkListener from './components/InviteDeepLinkListener';
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
      Main: {
        screens: {
          board: 'board-tab',
          message: 'message',
          school: 'school',
          timer: 'timer',
          mypage: 'mypage',
        },
      },
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

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * 네이티브 스플래시를 유지한 채 폰트·버전체크·인증 하이드레이션을 끝낸 뒤 숨김.
 * 강제업데이트/버전확인 실패 화면은 스플래시를 먼저 내린 뒤 표시.
 */
function SplashHideWhenReady({ fontsLoaded, versionPhase }) {
  const { authHydrated } = useAuth();
  const hiddenRef = useRef(false);

  useEffect(() => {
    if (hiddenRef.current) return;
    if (!fontsLoaded) return;
    if (versionPhase === 'checking') return;

    if (versionPhase === 'force' || versionPhase === 'error') {
      hiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    if (versionPhase === 'ok' && authHydrated) {
      hiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, versionPhase, authHydrated]);

  return null;
}

// ---------- Auth Flow: 로그인 상태에 따른 스택 분리 (선언적 내비게이션) ----------
// 비로그인 시 Auth 스택만, 로그인 시 Main 스택만 렌더링하여
// "로그인 후 뒤로가기 시 다시 로그인 창" 문제를 근본적으로 방지합니다.
// 로그아웃 시: 화면 어디서든 useAuth().logout() 호출하면 로그인 스택으로 전환됩니다.

function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="SignupEntry"
      screenOptions={{ headerShown: false }}
    >
      {/* <Stack.Screen name="TestLogin" component={TestLogin} /> */}
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignupEntry" component={SignupEntry} />
      <Stack.Screen name="SignKakao" component={SignKakao} />
      <Stack.Screen name="SignApple" component={SignApple} />
      <Stack.Screen name="SignPhone" component={SignPhone} />
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
      <Stack.Screen name="SignProfileUsername" component={SignProfileUsername} />
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
      <Stack.Screen name="PeriodTimeSettings" component={PeriodTimeSettings} />
      <Stack.Screen name="PeriodTimeSetup" component={PeriodTimeSetup} />
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
      <Stack.Screen name="BadgeManage" component={BadgeManage} />
      <Stack.Screen name="HiddenPostsAppeals" component={HiddenPostsAppeals} />
      <Stack.Screen name="DeveloperWhack" component={DeveloperWhack} />
      <Stack.Screen name="Inquiry" component={Inquiry} />
      <Stack.Screen name="InAppInquiry" component={InAppInquiry} />
      <Stack.Screen name="MyInquiries" component={MyInquiries} />
      <Stack.Screen name="InquiryDetail" component={InquiryDetail} />
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
  const [showCertificateResubmit, setShowCertificateResubmit] = useState(false);
  const [showCertificateGuide, setShowCertificateGuide] = useState(false);
  const [showAltVerifyChoice, setShowAltVerifyChoice] = useState(false);
  const [showNeisPlusResubmit, setShowNeisPlusResubmit] = useState(false);
  const [showRejectedInquiry, setShowRejectedInquiry] = useState(false);
  const [resubmitMode, setResubmitMode] = useState('rejected');
  const pollRef = useRef(null);

  /**
   * __DEV__ 전용: 로그인 후 학생증 재제출 화면만 바로 미리보기
   * true 로 바꾸면 REJECT/거절 상태와 무관하게 StudentIdResubmit 을 연다.
   * 확인 끝나면 반드시 false 로 되돌릴 것.
   */
  const DEV_PREVIEW_STUDENT_ID_RESUBMIT = false;

  useEffect(() => {
    if (!authHydrated || isLoggedIn) return undefined;
    let cancelled = false;
    (async () => {
      const signupPending = await getSignupPendingSession();
      if (signupPending && !cancelled) {
        const targetScreen =
          signupPending.provider === 'kakao'
            ? 'SignKakao'
            : signupPending.provider === 'apple'
              ? 'SignApple'
              : signupPending.provider === 'phone'
                ? 'SignPhone'
                : 'Sign';
        const tryNavigateSignup = () => {
          if (!navigationRef.isReady()) return false;
          const route = navigationRef.getCurrentRoute?.();
          if (route?.name !== targetScreen) {
            navigationRef.navigate(targetScreen, { resumeSession: true });
          }
          return true;
        };
        if (!tryNavigateSignup()) {
          const timer = setInterval(() => {
            if (tryNavigateSignup()) clearInterval(timer);
          }, 150);
          return () => clearInterval(timer);
        }
        return undefined;
      }

      const pending = await getPendingInicisSession();
      if (!pending || cancelled) return;
      const tryNavigate = () => {
        if (!navigationRef.isReady()) return false;
        const route = navigationRef.getCurrentRoute?.();
        if (route?.name !== 'Sign') {
          navigationRef.navigate('Sign', { resumeInicis: true });
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
    const handleVerificationPush = (remoteMessage) => {
      const relatedType = String(remoteMessage?.data?.relatedType || '').trim();
      if (
        relatedType === 'student_verification_approved' ||
        relatedType === 'student_verification_rejected'
      ) {
        refreshStudentVerification();
      }
    };

    const handleNotificationOpened = (remoteMessage) => {
      handleVerificationPush(remoteMessage);
      const data = remoteMessage?.data || {};
      const relatedType = String(data?.relatedType || '').trim();
      // 검수 게이트 중에는 MainStack 이 없어 navigate 생략 — 상태 갱신만으로 진입/거절 화면 전환
      if (
        relatedType === 'student_verification_approved' ||
        relatedType === 'student_verification_rejected'
      ) {
        return;
      }
      if (!navigationRef.isReady()) return;
      const { name, params } = resolvePushNavigation(data, remoteMessage);
      if (!name) return;
      navigateViaMainEntry({
        name,
        params,
        relatedType,
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
        onForegroundMessage: handleVerificationPush,
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
  }, [isLoggedIn, refreshStudentVerification]);

  if (!authHydrated) return null;

  if (!isLoggedIn) return <AuthStack />;

  if (__DEV__ && DEV_PREVIEW_STUDENT_ID_RESUBMIT) {
    return (
      <StudentIdResubmit
        mode="rejected"
        navigation={{ goBack: () => {} }}
      />
    );
  }

  if (showResubmit) {
    return (
      <StudentIdResubmit
        mode={resubmitMode}
        navigation={{ goBack: () => setShowResubmit(false) }}
      />
    );
  }

  // 거절 플로우: SafeAreaView 는 여기 1곳만 (화면 전환 시 remount 점프 방지)
  const inRejectedAltFlow =
    showRejectedInquiry ||
    showAltVerifyChoice ||
    showNeisPlusResubmit ||
    showCertificateGuide ||
    showCertificateResubmit ||
    studentVerificationStatus === 'REJECTED';

  if (inRejectedAltFlow) {
    let rejectedBody = (
      <StudentVerificationRejected
        onResubmitStudentId={() => {
          setResubmitMode('rejected');
          setShowResubmit(true);
        }}
        onResubmitCertificate={() => setShowAltVerifyChoice(true)}
        onInquiry={() => setShowRejectedInquiry(true)}
      />
    );
    if (showRejectedInquiry) {
      rejectedBody = (
        <InAppInquiry
          navigation={{ goBack: () => setShowRejectedInquiry(false) }}
          fullScreenOverlay
        />
      );
    } else if (showNeisPlusResubmit) {
      rejectedBody = (
        <NeisPlusResubmit
          navigation={{
            goBack: () => {
              setShowNeisPlusResubmit(false);
              setShowAltVerifyChoice(true);
            },
            closeFlow: () => {
              setShowNeisPlusResubmit(false);
              setShowAltVerifyChoice(false);
            },
          }}
        />
      );
    } else if (showCertificateResubmit) {
      rejectedBody = (
        <CertificateResubmit
          navigation={{
            goBack: () => {
              setShowCertificateResubmit(false);
              setShowCertificateGuide(true);
            },
            closeFlow: () => {
              setShowCertificateResubmit(false);
              setShowCertificateGuide(false);
              setShowAltVerifyChoice(false);
            },
          }}
        />
      );
    } else if (showCertificateGuide) {
      rejectedBody = (
        <CertificateGuideResubmit
          navigation={{
            goBack: () => {
              setShowCertificateGuide(false);
              setShowAltVerifyChoice(true);
            },
          }}
          onProceed={() => {
            setShowCertificateGuide(false);
            setShowCertificateResubmit(true);
          }}
        />
      );
    } else if (showAltVerifyChoice) {
      rejectedBody = (
        <AltVerifyChoiceResubmit
          navigation={{ goBack: () => setShowAltVerifyChoice(false) }}
          onSelectNeisPlus={() => {
            setShowAltVerifyChoice(false);
            setShowNeisPlusResubmit(true);
          }}
          onSelectCertificate={() => {
            setShowAltVerifyChoice(false);
            setShowCertificateGuide(true);
          }}
        />
      );
    }

    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top', 'bottom']}
      >
        {rejectedBody}
      </SafeAreaView>
    );
  }

  if (
    studentVerificationStatus === 'PENDING' &&
    !reverificationSubmissionPending
  ) {
    return <StudentVerificationGate />;
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
        <WidgetDeepLinkHandler />
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
  /** boot: 폰트 대기 | splash_ad: 전면 광고 | ready: 앱 */
  const [bootPhase, setBootPhase] = useState('boot');
  const [splashAd, setSplashAd] = useState(null);
  const [versionPhase, setVersionPhase] = useState(
    __DEV__ ? 'ok' : 'checking',
  );

  useEffect(() => {
    if (!fontsLoaded) return undefined;
    // 버전 확인·인증 준비는 네이티브 스플래시 위에서 진행. hide는 SplashHideWhenReady.
    // TODO: /api/ads 연동 후 splash 슬롯 fetch → splash_ad
    setSplashAd(null);
    setBootPhase('ready');
    return undefined;
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

  // 로그인·게이트 전에 위젯 URL이 오면 pending에 보관 (Main 진입 후 Handler가 소비)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        if (!cancelled && initial) stashWidgetDeepLinkFromUrl(initial);
      } catch {
        // ignore
      }
    })();
    const sub = Linking.addEventListener('url', ({ url }) => {
      stashWidgetDeepLinkFromUrl(url);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
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

  if (!fontsLoaded || bootPhase === 'boot') return null;

  if (bootPhase === 'splash_ad' && splashAd) {
    return (
      <SplashAd
        ad={splashAd}
        onFinish={() => setBootPhase('ready')}
      />
    );
  }

  return (
    <SafeAreaProvider
      initialMetrics={initialWindowMetrics}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar style="dark" backgroundColor={colors.background} />
      <OfflineGate>
        {/* Auth·스플래시 hide는 Gate 밖 — force/error 시 children 미렌더로 hideAsync가 안 불리던 버그 방지 */}
        <AuthProvider>
          <SplashHideWhenReady
            fontsLoaded={fontsLoaded}
            versionPhase={versionPhase}
          />
          <ForceUpdateGate onPhaseChange={setVersionPhase}>
            <KeyboardProvider>
              <LaunchAdModal>
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
                              <InviteDeepLinkListener />
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
              </LaunchAdModal>
            </KeyboardProvider>
          </ForceUpdateGate>
        </AuthProvider>
      </OfflineGate>
    </SafeAreaProvider>
  );
}
