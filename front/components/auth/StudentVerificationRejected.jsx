import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { clearAuthToken, clearUserSessionStorage } from '../../utils/api';
import * as socketManager from '../../view/src/socketManager';

/**
 * 학생 인증 거절(REJECTED) 안내 — SafeArea 는 App 거절 플로우 셸에서만 처리
 */
export default function StudentVerificationRejected({
  onResubmitStudentId,
  onResubmitCertificate,
  onInquiry,
}) {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const { rejectReason, logout } = useAuth();

  const reasonText = rejectReason?.trim() || '관리자 확인 결과, 제출하신 자료로 재학을 확인할 수 없습니다.';

  const handleLogout = async () => {
    try {
      socketManager.disconnectSocket?.({ force: true, reason: 'student_rejected_logout' });
    } catch {
      // ignore
    }
    await clearUserSessionStorage();
    await clearAuthToken();
    logout();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          { paddingHorizontal: normalize(28), paddingVertical: normalize(24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.emoji, { fontSize: normalize(48) }]}>❌</Text>
        <Text style={[styles.title, { fontSize: normalize(20) }]}>
          학생 인증이 거절되었습니다
        </Text>

        <View
          style={[
            styles.reasonCard,
            {
              borderRadius: normalize(14),
              padding: normalize(16),
              marginBottom: normalize(24),
            },
          ]}
        >
          <Text style={[styles.reasonLabel, { fontSize: normalize(12) }]}>
            거절 사유
          </Text>
          <Text style={[styles.reasonText, { fontSize: normalize(16), lineHeight: normalize(24) }]}>
            {reasonText}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { height: normalize(50), borderRadius: normalize(24) }]}
          activeOpacity={0.9}
          onPress={onResubmitStudentId}
        >
          <Text style={[styles.buttonText, { fontSize: normalize(16) }]}>
            학생증 제출하기
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              height: normalize(50),
              borderRadius: normalize(24),
              marginTop: normalize(12),
            },
          ]}
          activeOpacity={0.9}
          onPress={onResubmitCertificate}
        >
          <Text style={[styles.secondaryButtonText, { fontSize: normalize(16) }]}>
            나이스+ / 증명서 선택하기
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              height: normalize(50),
              borderRadius: normalize(24),
              marginTop: normalize(12),
            },
          ]}
          activeOpacity={0.9}
          onPress={onInquiry}
        >
          <Text style={[styles.secondaryButtonText, { fontSize: normalize(16) }]}>
            문의하기
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: normalize(16), paddingVertical: normalize(8) }}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { fontSize: normalize(14) }]}>
            로그아웃
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Baloo2-Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: colors.alertLight,
    borderWidth: 1,
    borderColor: colors.alert,
    borderLeftWidth: 4,
    borderLeftColor: colors.alertDark,
  },
  reasonLabel: {
    fontFamily: 'Baloo2-Bold',
    color: colors.alertDark,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  reasonText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.textPrimary,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.background,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.primaryDark,
  },
  logoutText: {
    fontFamily: 'Baloo2-Regular',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
