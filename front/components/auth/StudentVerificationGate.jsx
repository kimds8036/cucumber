import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const POLL_MS = 30_000;

/**
 * 학생증 승인 대기(PENDING) 전면 게이트 — 캐시 기반 즉시 표시 + /me 폴링
 */
export default function StudentVerificationGate() {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const { refreshStudentVerification } = useAuth();
  const [checking, setChecking] = useState(false);
  const pollRef = useRef(null);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      await refreshStudentVerification();
    } finally {
      setChecking(false);
    }
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
        <Text style={[styles.emoji, { fontSize: normalize(48) }]}>🕵️‍♂️</Text>
        <Text style={[styles.title, { fontSize: normalize(20) }]}>
          학생증 확인 및 승인 진행 중입니다
        </Text>
        <Text style={[styles.body, { fontSize: normalize(15) }]}>
          오이 커뮤니티는 안전한 학생 인증 기반으로 운영됩니다. 관리자가 확인 후
          승인 처리를 완료하면 자동으로 앱 접속이 가능합니다. (최대 24시간 소요)
        </Text>
        {checking ? (
          <ActivityIndicator
            style={{ marginTop: normalize(24) }}
            color={colors.primary}
            size="large"
          />
        ) : (
          <Text style={[styles.hint, { fontSize: normalize(13) }]}>
            승인 상태를 확인하는 중…
          </Text>
        )}
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
  },
  hint: {
    marginTop: 24,
    fontFamily: 'Baloo2-Regular',
    color: colors.textLight20,
  },
});
