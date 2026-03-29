import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from './styles/colors';
import Login from './view/src/Login';
import Sign from './view/src/Sign';
import MainScreen from './view/src/MainScreen';
import AddTimetable from './view/src/addtimetable';
import MyPosts from './view/src/myposts';
import ScrapedPosts from './view/src/scrapedposts';
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
import MailHistoryScreen from './view/src/history';
import SchoolMailboxScreen from './view/src/schoolMailbox';
import SchoolMailDetail from './view/src/schoolMailDetail';
import SendSchoolMailScreen from './view/src/sendSchoolMailScreen';
import SchoolBoardAll from './view/src/schoolBoardAll';
import OtherSchoolScreen from './view/src/otherschool';
import Timer from './view/src/timer';
import FriendsScreen from './view/src/friendsscreen';
import MealCalender from './view/src/mealcalender';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from './context/KeyboardContext';
import { NotificationProvider } from './context/NotificationContext';
import { FriendProvider } from './context/FriendContext';
import { SocketProvider } from './context/SocketContext';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

SplashScreen.preventAutoHideAsync();
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
        <SocketProvider>
          <NotificationProvider>
            <FriendProvider>
              <NavigationContainer theme={navigationTheme}>
                <Stack.Navigator
                  initialRouteName="Login"
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                >
                  <Stack.Screen name="Login" component={Login} />
                  <Stack.Screen name="Sign" component={Sign} />
                  <Stack.Screen name="Main" component={MainScreen} />
                  <Stack.Screen name="BoardWrite" component={BoardWrite} />
                  <Stack.Screen name="BoardDetail" component={BoardDetail} />
                  <Stack.Screen name="Chat" component={Chat} />
                  <Stack.Screen name="AddTimetable" component={AddTimetable} />
                  <Stack.Screen name="MyPosts" component={MyPosts} />
                  <Stack.Screen name="ScrapedPosts" component={ScrapedPosts} />
                  <Stack.Screen name="NotificationSettings" component={NotificationSettings} />
                  <Stack.Screen name="ChangePassword" component={ChangePassword} />
                  <Stack.Screen name="ChangeSchool" component={ChangeSchool} />
                  <Stack.Screen name="Search" component={SearchScreen} />
                  <Stack.Screen name="Notification" component={NotificationScreen} />
                  <Stack.Screen name="SendMail" component={SendMailScreen} />
                  <Stack.Screen name="MailDetail" component={AnonymousMailScreen} />
                  <Stack.Screen name="AnonymousMailbox" component={AnonymousMailScreen} />
                  <Stack.Screen name="SchoolBoardAll" component={SchoolBoardAll} />
                  <Stack.Screen name="SchoolMailbox" component={SchoolMailboxScreen} />
                  <Stack.Screen name="SchoolMailDetail" component={SchoolMailDetail} />
                  <Stack.Screen name="SendSchoolMail" component={SendSchoolMailScreen} />
                  <Stack.Screen name="MealCalendar" component={MealCalender} />
                  <Stack.Screen name="MailReply" component={MailReplyScreen} />
                  <Stack.Screen name="MailHistory" component={MailHistoryScreen} />
                  <Stack.Screen name="AnonymousMailReply" component={MailReplyScreen} />
                  <Stack.Screen name="AnonymousMailHistory" component={MailHistoryScreen} />
                  <Stack.Screen name="Timer" component={Timer} />
                  <Stack.Screen name="Friends" component={FriendsScreen} />
                  <Stack.Screen name="SearchScreen" component={SearchScreen} />
                  <Stack.Screen name="SearchResult" component={SearchResult} />
                  <Stack.Screen name="OtherSchool" component={OtherSchoolScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </FriendProvider>
          </NotificationProvider>
        </SocketProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

