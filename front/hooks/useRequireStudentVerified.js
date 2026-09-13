import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * 미인증 사용자가 우편 등 제한 화면에 직접 진입(푸시 등)한 경우 되돌림.
 * @returns {boolean} true면 학생 인증 완료 — 화면 로직 진행 가능
 */
export function useRequireStudentVerified(navigation, options = {}) {
  const { studentVerificationStatus } = useAuth();
  const isApproved = studentVerificationStatus === 'APPROVED';
  const alertedRef = useRef(false);
  const message =
    options.message ||
    '학생 인증이 필요한 기능입니다. 학생증으로 인증해 주세요.';

  useEffect(() => {
    if (isApproved || alertedRef.current) return;
    alertedRef.current = true;
    Alert.alert('학생 인증 필요', message, [
      {
        text: '확인',
        onPress: () => navigation?.goBack?.(),
      },
    ]);
  }, [isApproved, message, navigation]);

  return isApproved;
}
