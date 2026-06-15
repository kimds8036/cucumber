import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const NotificationAdPlaceholder = ({ adData }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );
  const contentText =
    adData?.content ?? adData?.body ?? '여기에 광고가 표시됩니다.';

  return (
    <View style={styles.notificationItem}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="notifications-outline"
          size={styles.notificationIcon.size}
          color={colors.scrap}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>광고</Text>
        <Text style={styles.notificationText} numberOfLines={2}>
          {contentText}
        </Text>
        <Text style={styles.notificationTime}>AD</Text>
      </View>
    </View>
  );
};

export default NotificationAdPlaceholder;
