import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView, Text, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainHeader from './view/frame/mainHeader';
import MainFooter from './view/frame/mainFooter';
import Login from './view/src/Login';
import Sign from './view/src/Sign';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

const Stack = createNativeStackNavigator();

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    content: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    scrollContent: {
      flexGrow: 1,
    },
    contentInner: {
      padding: width * 0.04,
    },
    sampleText: {
      fontSize: normalize(16),
      color: '#333',
      marginBottom: normalize(12),
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* 헤더 */}
      <MainHeader title="전체" />

      {/* 메인 컨텐츠 영역 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentInner}>
          <Text style={styles.sampleText}>메인 컨텐츠 영역</Text>
          <Text style={styles.sampleText}>게시글이 여기에 표시됩니다</Text>
        </View>
      </ScrollView>

      {/* 푸터 */}
      <MainFooter activeTab="board" />
    </SafeAreaView>
  );
}

function MainBoard() {
  return <AppContent />;
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
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Sign" component={Sign} />
          <Stack.Screen name="MainBoard" component={MainBoard} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}