import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './view/src/Login';
import Sign from './view/src/Sign';
import IDfind from './view/src/IDfind';
import PWfind from './view/src/PWfind';
import MainScreen from './view/src/MainScreen';
import AddTimetable from './view/src/addtimetable';
import MyPosts from './view/src/myposts';
import NotificationSettings from './view/src/notificationsettings';
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
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from './context/KeyboardContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider, LocationGate } from './context/LocationContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { FriendProvider } from './context/FriendContext';
import { ToastProvider } from './context/ToastContext';
import ToastHost from './components/common/ToastHost';
import AlertHost from './components/common/AlertHost';
import { navigationRef } from './navigation/navigationRef';
import { appAlert } from './utils/appAlert';
import { configureTimerNotificationHandler } from './utils/timerRunNotification';
// TEMP(expo-go): Firebase Messaging은 네이티브 빌드에서만 사용
// import { initFCM, setupFCMHandlers } from './utils/fcmService';

const Stack = createNativeStackNavigator();
const linking = {
  prefixes: ['cucumber://'],
  config: {
    screens: {
      BoardDetail: 'board/:postId',
    },
  },
};

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
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Sign" component={Sign} />
      <Stack.Screen name="IDfind" component={IDfind} />
      <Stack.Screen name="PWfind" component={PWfind} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen name="BoardWrite" component={BoardWrite} />
      <Stack.Screen name="BoardDetail" component={BoardDetail} />
      <Stack.Screen name="Chat" component={ChatRoomScreen} />
      <Stack.Screen name="DMChat" component={DMChatScreen} />
      <Stack.Screen name="AddTimetable" component={AddTimetable} />
      <Stack.Screen name="MyPosts" component={MyPosts} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
      />
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
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="SearchResult" component={SearchResult} />
      <Stack.Screen name="OtherSchool" component={OtherSchoolScreen} />
      <Stack.Screen name="MealCalendar" component={MealCalender} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    // TEMP(expo-go): RNFirebase 의존 코드 임시 비활성화
    let cleanup;
    // (async () => {
    //   await initFCM();
    //   cleanup = setupFCMHandlers();
    // })();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) return <AuthStack />;
  return (
    <LocationGate>
      <MainStack />
    </LocationGate>
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

  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('[Notification] Expo Go 환경에서는 원격 푸시 기능을 초기화하지 않습니다.');
      return undefined;
    }

    configureTimerNotificationHandler();
    Notifications.requestPermissionsAsync().catch((error) => {
      console.warn('[Notification] 권한 요청 실패:', error?.message ?? error);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const targetScreen = response?.notification?.request?.content?.data?.targetScreen;
      if (targetScreen === 'Timer' && navigationRef.isReady()) {
        navigationRef.dispatch(
          StackActions.replace('Timer')
        );
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <LocationProvider>
          <SocketProvider>
            <ToastProvider>
              <NotificationProvider>
                <FriendProvider>
                  <NavigationContainer
                    ref={navigationRef}
                    linking={linking}
                  >
                    <RootNavigator />
                    <ToastHost />
                    <AlertHost />
                  </NavigationContainer>
                </FriendProvider>
              </NotificationProvider>
            </ToastProvider>
          </SocketProvider>
          </LocationProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
