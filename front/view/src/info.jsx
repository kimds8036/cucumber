import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { createNotificationStyles } from '../../styles/notification.style';

const SUPPORT_MENU_SPECS = [
  { key: 'notice', title: '공지사항' },
  { key: 'contact', title: '문의사항' },
  { key: 'community-guide', title: '커뮤니티 가이드' },
  { key: 'terms', title: '서비스 이용약관' },
  { key: 'privacy', title: '개인정보 처리방침' },
  { key: 'youth', title: '청소년 보호정책' },
  { key: 'opensource', title: '오픈소스 라이선스' },
];

function MenuSkeleton({ styles, normalize }) {
  return (
    <>
      <View style={[styles.notificationItem, { opacity: 0.55 }]}>
        <View style={styles.notificationContent}>
          <View
            style={{
              width: normalize(72),
              height: normalize(14),
              borderRadius: normalize(4),
              backgroundColor: colors.textLight10,
            }}
          />
          <View
            style={{
              marginTop: normalize(6),
              width: normalize(48),
              height: normalize(12),
              borderRadius: normalize(4),
              backgroundColor: colors.textLight10,
            }}
          />
        </View>
      </View>
      {SUPPORT_MENU_SPECS.map((menu) => (
        <View
          key={`sk-${menu.key}`}
          style={[styles.notificationItem, { opacity: 0.45 }]}
        >
          <View style={styles.notificationContent}>
            <View
              style={{
                width: '55%',
                height: normalize(14),
                borderRadius: normalize(4),
                backgroundColor: colors.textLight10,
              }}
            />
          </View>
          <Ionicons
            name="chevron-forward"
            size={normalize(20)}
            color={colors.textLight10}
          />
        </View>
      ))}
    </>
  );
}

const Info = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createNotificationStyles(normalize),
    [normalize],
  );
  const [versionReady, setVersionReady] = useState(false);
  const appVersion = Constants.expoConfig?.version || '확인 불가';

  useEffect(() => {
    const timer = setTimeout(() => setVersionReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const supportMenus = useMemo(
    () => [
      {
        key: 'version',
        title: '앱 버전',
        subtitle: `v${appVersion}`,
        isStatic: true,
      },
      ...SUPPORT_MENU_SPECS,
    ],
    [appVersion],
  );

  const handleMenuPress = (menu) => {
    if (menu.isStatic) return;
    if (menu.key === 'contact') {
      navigation.navigate('MyInquiries');
      return;
    }
    if (menu.key === 'notice') {
      navigation.navigate('Announcement');
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="고객 지원" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!versionReady ? (
          <MenuSkeleton styles={styles} normalize={normalize} />
        ) : (
          supportMenus.map((menu) => (
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Info;
