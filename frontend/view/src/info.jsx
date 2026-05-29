import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { createNotificationStyles } from '../../styles/notification.style';

const Info = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createNotificationStyles(normalize),
    [normalize],
  );
  const appVersion = Constants.expoConfig?.version || '확인 불가';

  const supportMenus = [
    {
      key: 'version',
      title: '앱 버전',
      subtitle: `v${appVersion}`,
      isStatic: true,
    },
    { key: 'contact', title: '문의하기' },
    { key: 'notice', title: '공지사항' },
    //{ key: 'user-guide', title: 'Youth Paper 사용 가이드' },
    { key: 'community-guide', title: '커뮤니티 가이드' },
    { key: 'terms', title: '서비스 이용약관' },
    { key: 'privacy', title: '개인정보 처리방침' },
    { key: 'youth', title: '청소년 보호정책' },
    { key: 'opensource', title: '오픈소스 라이선스' },
  ];

  const handleMenuPress = (menu) => {
    if (menu.isStatic) return;
    if (menu.key === 'contact') {
      navigation.navigate('InAppInquiry');
      return;
    }
    if (menu.key === 'notice') {
      navigation.navigate('Announcement');
      return;
    }
    if (menu.key === 'user-guide') {
      navigation.navigate('GuideOverlay', { mode: 'guide' });
      return;
    }
    if (menu.key === 'community-guide') {
      navigation.navigate('CommunityGuide');
      return;
    }
    if (menu.key === 'terms') {
      navigation.navigate('ServiceTermsOfService');
      return;
    }
    if (menu.key === 'privacy') {
      navigation.navigate('PrivacyPolicy');
      return;
    }
    if (menu.key === 'youth') {
      navigation.navigate('YouthProtectionPolicy');
      return;
    }
    if (menu.key === 'opensource') {
      navigation.navigate('OpenSourceLicenses');
      return;
    }
    Alert.alert('안내', `${menu.title} 페이지는 준비 중입니다.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="고객 지원" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {supportMenus.map((menu) => (
          <TouchableOpacity
            key={menu.key}
            style={styles.notificationItem}
            activeOpacity={menu.isStatic ? 1 : 0.7}
            onPress={() => handleMenuPress(menu)}
          >
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{menu.title}</Text>
              {menu.subtitle ? (
                <Text style={styles.notificationText}>{menu.subtitle}</Text>
              ) : null}
            </View>
            {!menu.isStatic ? (
              <Ionicons
                name="chevron-forward"
                size={normalize(20)}
                color={colors.textSecondary}
              />
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Info;
