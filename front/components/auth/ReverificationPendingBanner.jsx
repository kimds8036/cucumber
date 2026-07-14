import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';

/**
 * 재인증 학생증 검수 대기 — 앱 이용은 유지, 상단 안내만
 */
export default function ReverificationPendingBanner() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + normalize(6),
          paddingHorizontal: normalize(12),
          paddingBottom: normalize(8),
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: normalize(14) }]}>
          학생증 재인증 검수 중
        </Text>
        <Text style={[styles.body, { fontSize: normalize(12) }]}>
          관리자 확인이 완료될 때까지 앱을 계속 이용할 수 있습니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 8,
  },
  card: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    fontFamily: 'Baloo2-Bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  body: {
    fontFamily: 'Baloo2-Regular',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
