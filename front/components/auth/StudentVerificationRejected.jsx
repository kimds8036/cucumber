import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';
import { clearAuthToken, clearUserSessionStorage } from '../../utils/api';
import * as socketManager from '../../view/src/socketManager';
import InAppInquiry from '../../view/src/InAppInquiry';

/**
 * 학생증 거절(REJECTED) 안내 + 재제출 / 문의 / 로그아웃
 */
export default function StudentVerificationRejected({ onResubmit }) {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const { rejectReason, logout } = useAuth();
  const [showInquiry, setShowInquiry] = useState(false);

  const reasonText = rejectReason?.trim() || '관리자 확인 결과';

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

  if (showInquiry) {
    return (
      <InAppInquiry
        navigation={{ goBack: () => setShowInquiry(false) }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={[styles.emoji, { fontSize: normalize(48) }]}>❌</Text>
        <Text style={[styles.title, { fontSize: normalize(20) }]}>
          학생증 승인이 거절되었습니다
        </Text>
        <Text style={[styles.body, { fontSize: normalize(15) }]}>
          {`사유: ${reasonText}\n아래 버튼을 눌러 올바른 학생증 사진으로 다시 인증을 진행해 주세요.`}
        </Text>
        <TouchableOpacity
          style={[styles.button, { height: normalize(50), borderRadius: normalize(24) }]}
          activeOpacity={0.9}
          onPress={onResubmit}
        >
          <Text style={[styles.buttonText, { fontSize: normalize(16) }]}>
            학생증 다시 제출하기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { height: normalize(50), borderRadius: normalize(24), marginTop: normalize(12) },
          ]}
          activeOpacity={0.9}
          onPress={() => setShowInquiry(true)}
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
          <Text style={[styles.logoutText, { fontSize: normalize(14) }]}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emoji: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Baloo2-Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: 'Baloo2-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
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
    color: colors.primary,
  },
  logoutText: {
    fontFamily: 'Baloo2-Regular',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
