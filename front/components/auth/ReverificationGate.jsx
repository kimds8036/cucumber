import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';

const POLL_MS = 30_000;

/**
 * 재인증 유예 기한 경과(restricted) — 앱 이용 차단 + 학생증 재제출
 */
export default function ReverificationGate({ onResubmit }) {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const { refreshStudentVerification } = useAuth();
  const pollRef = useRef(null);

  const runCheck = useCallback(async () => {
    await refreshStudentVerification();
  }, [refreshStudentVerification]);

  useEffect(() => {
    runCheck();
    pollRef.current = setInterval(runCheck, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runCheck]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={[styles.emoji, { fontSize: normalize(48) }]}>📋</Text>
        <Text style={[styles.title, { fontSize: normalize(20) }]}>
          새 학년도 재인증이 필요합니다
        </Text>
        <Text style={[styles.body, { fontSize: normalize(15) }]}>
          매년 3월 학년도 전환에 따라 학생증 재인증이 필요합니다.{'\n'}
          재인증 유예 기간이 지나 앱 이용이 일시 제한되었습니다.{'\n'}
          아래 버튼으로 올해 학생증을 제출해 주세요.
        </Text>
        <TouchableOpacity
          style={[styles.button, { height: normalize(50), borderRadius: normalize(24) }]}
          activeOpacity={0.9}
          onPress={onResubmit}
        >
          <Text style={[styles.buttonText, { fontSize: normalize(16) }]}>
            학생증 재인증하기
          </Text>
        </TouchableOpacity>
        <ActivityIndicator
          style={{ marginTop: normalize(20) }}
          color={colors.textSecondary}
          size="small"
        />
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
