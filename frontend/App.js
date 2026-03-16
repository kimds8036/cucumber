import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './view/src/Login';
import Sign from './view/src/Sign';
import MainScreen from './view/src/MainScreen';
import AddTimetable from './view/src/addtimetable';
import MyPosts from './view/src/myposts';
import LikedPosts from './view/src/likedposts';
import NotificationSettings from './view/src/notificationsettings';
import ChangePassword from './view/src/changepassword';
import ChangeSchool from './view/src/changeschool';
import SearchScreen from './view/src/searchscreen';
import NotificationScreen from './view/src/notificationscreen';
import BoardWrite from './view/src/boardWrite';
import SearchResult from './view/src/SearchResult';
import BoardDetail from './view/src/boardDetail';
import Chat from './view/src/Chat';
import SendMailScreen from './view/src/sendmailscreen';
import AnonymousMailScreen from './view/src/mailscreen';
import MailReplyScreen from './view/src/mailreply';
import SchoolMailboxScreen from './view/src/schoolMailbox';
import SchoolBoardAll from './view/src/schoolBoardAll';
import OtherSchoolScreen from './view/src/otherschool';
import Timer from './view/src/timer';
import FriendsScreen from './view/src/friendsscreen';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from './context/KeyboardContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const Stack = createNativeStackNavigator();

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
      <Stack.Screen name="Chat" component={Chat} />
      <Stack.Screen name="AddTimetable" component={AddTimetable} />
      <Stack.Screen name="MyPosts" component={MyPosts} />
      <Stack.Screen name="LikedPosts" component={LikedPosts} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="ChangeSchool" component={ChangeSchool} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
      <Stack.Screen name="SendMail" component={SendMailScreen} />
      <Stack.Screen name="MailDetail" component={AnonymousMailScreen} />
      <Stack.Screen name="SchoolBoardAll" component={SchoolBoardAll} />
      <Stack.Screen name="Timer" component={Timer} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="SearchResult" component={SearchResult} />
      <Stack.Screen name="OtherSchool" component={OtherSchoolScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <MainStack /> : <AuthStack />;
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

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
