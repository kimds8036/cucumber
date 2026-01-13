import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from './view/frame/mainHeader';
import MainFooter from './view/frame/mainFooter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

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