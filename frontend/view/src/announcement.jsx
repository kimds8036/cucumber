import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { createNotificationStyles } from '../../styles/notification.style';

const ANNOUNCEMENTS = [
  { id: '1', title: '서비스 점검 안내', date: '2026.05.05' },
  { id: '2', title: '커뮤니티 운영정책 개정 안내', date: '2026.05.02' },
  { id: '3', title: '개인정보 처리방침 변경 안내', date: '2026.04.28' },
  { id: '4', title: '서비스 점검 안내', date: '2026.05.05' },
  { id: '5', title: '커뮤니티 운영정책 개정 안내', date: '2026.05.02' },
  { id: '6', title: '개인정보 처리방침 변경 안내', date: '2026.04.28' },
];

const Announcement = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createNotificationStyles(normalize), [normalize]);

  const handlePressItem = (title) => {
    Alert.alert('공지사항', `${title}\n상세 페이지는 준비 중입니다.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="공지사항" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.announcementListContainer}
        showsVerticalScrollIndicator={false}
      >
        {ANNOUNCEMENTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.announcementItem}
            activeOpacity={0.75}
            onPress={() => handlePressItem(item.title)}
          >
            <View style={styles.announcementContent}>
              <Text style={styles.announcementTitle}>{item.title}</Text>
              <Text style={styles.announcementMeta}>{item.date}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={normalize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Announcement;
