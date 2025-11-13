import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 기존 화면들 import
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import GeneralScreen from './src/screens/GeneralScreen';
import BoardDetailScreen from './src/screens/BoardDetailScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />
          <Stack.Screen name="General" component={GeneralScreen} options={{ title: '게시판' }} />
          <Stack.Screen name="BoardDetail" component={BoardDetailScreen} options={{ title: '게시판 상세' }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: '게시글 상세' }} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}