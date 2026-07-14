import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';

function formatDeadline(raw) {
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return String(raw);
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  return `${m}월 ${d}일`;
}

/**
 * grace / required 상태 상단 재인증 안내 배너
 */
export default function ReverificationReminderBanner({
  status,
  deadline,
  onResubmit,
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const deadlineLabel = formatDeadline(deadline);

  const isRequired = status === 'required';
  const title = isRequired
    ? '학생증 재인증이 필요합니다'
    : '새 학년도 재인증 안내';
  const body = isRequired
    ? '올해 학생증으로 재인증을 완료해 주세요.'
    : deadlineLabel
      ? `${deadlineLabel}까지 재인증을 완료해 주세요.`
      : '3월 학년도 전환에 따라 재인증을 완료해 주세요.';

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
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.textCol}>
          <Text style={[styles.title, { fontSize: normalize(14) }]}>{title}</Text>
          <Text style={[styles.body, { fontSize: normalize(12) }]}>{body}</Text>
        </View>
        <TouchableOpacity
          style={[styles.btn, { paddingHorizontal: normalize(12), paddingVertical: normalize(8) }]}
          onPress={onResubmit}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { fontSize: normalize(13) }]}>재인증</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  textCol: {
    flex: 1,
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
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
  btnText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.background,
  },
});
