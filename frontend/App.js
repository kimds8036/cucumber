import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView, Text, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainHeader from './view/frame/mainHeader';
import MainFooter from './view/frame/mainFooter';
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
import BoardDetail from './view/src/boardDetail';
import Chat from './view/src/Chat';
import SendMailScreen from './view/src/sendmailscreen';
import SchoolBoardAll from './view/src/schoolBoardAll';
import Timer from './view/src/timer';
import FriendsScreen from './view/src/friendsscreen';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { KeyboardProvider } from './context/KeyboardContext';

const Stack = createNativeStackNavigator();

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
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Sign" component={Sign} />
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
          <Stack.Screen name="SchoolBoardAll" component={SchoolBoardAll} />
          <Stack.Screen name="Timer" component={Timer} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="SearchScreen" component={SearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}