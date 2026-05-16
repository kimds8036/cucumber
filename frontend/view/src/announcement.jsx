import React, { useMemo, useState } from 'react';
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

const Announcement = ({ navigation }) => {
  const [announcements] = useState([]);
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createNotificationStyles(normalize), [normalize]);
  const isEmpty = announcements.length === 0;

  const handlePressItem = (title) => {
    Alert.alert('공지사항', `${title}\n상세 페이지는 준비 중입니다.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="공지사항" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.announcementListContainer,
          isEmpty && styles.announcementEmptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <Text style={styles.announcementEmptyText}>아직 공지사항이 없습니다</Text>
        ) : (
          announcements.map((item) => (
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Announcement;
