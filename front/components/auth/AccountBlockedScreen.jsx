import React from 'react';
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
import { clearUserSessionStorage } from '../../utils/api';
import * as socketManager from '../../view/src/socketManager';

const COPY = {
  graduated: {
    emoji: '🎓',
    title: '졸업을 축하합니다!',
    body:
      '고등학교 졸업으로 Youth Paper 이용이 종료되었습니다.\n' +
      '학생 인증 기반 서비스 정책에 따라 앱 이용이 제한됩니다.',
  },
  adult: {
    emoji: '🙏',
    title: '이용이 종료되었습니다',
    body:
      '성인 연령으로 Youth Paper 이용이 종료되었습니다.\n' +
      '학생 인증 기반 서비스 정책에 따라 앱 이용이 제한됩니다.',
  },
};

/**
 * 졸업·성인 차단 전용 전면 화면 (재인증 불가, 로그아웃만)
 */
export default function AccountBlockedScreen({ variant = 'graduated' }) {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const { logout } = useAuth();
  const copy = COPY[variant] || COPY.graduated;

  const handleLogout = async () => {
    try {
      socketManager.disconnectSocket?.({ force: true, reason: 'account_blocked' });
    } catch {
      // ignore
    }
    await clearUserSessionStorage();
    logout();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={[styles.emoji, { fontSize: normalize(48) }]}>{copy.emoji}</Text>
        <Text style={[styles.title, { fontSize: normalize(20) }]}>{copy.title}</Text>
        <Text style={[styles.body, { fontSize: normalize(15) }]}>{copy.body}</Text>
        <TouchableOpacity
          style={[styles.button, { height: normalize(50), borderRadius: normalize(24) }]}
          activeOpacity={0.9}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, { fontSize: normalize(16) }]}>로그아웃</Text>
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
});
