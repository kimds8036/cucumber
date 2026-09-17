import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMainShellOptional } from '../context/MainShellContext';
import StudentVerificationCtaModal from '../components/auth/StudentVerificationCtaModal';
import { colors } from '../styles/colors';

/**
 * 미인증 사용자가 우편 등 제한 화면에 직접 진입(푸시·검색 등)한 경우
 * 통일 CTA 모달을 띄우고 화면 본문은 막음.
 *
 * @returns {{ allowed: boolean, Gate: React.ComponentType }}
 */
export function useRequireStudentVerified(navigation, options = {}) {
  const { studentVerificationStatus } = useAuth();
  const shell = useMainShellOptional();
  const isApproved = studentVerificationStatus === 'APPROVED';
  const [visible, setVisible] = useState(!isApproved);
  const pendingVerifyRef = useRef(false);
  const message = options.message;
  const reason = options.reason || 'restricted';

  useEffect(() => {
    if (isApproved) {
      pendingVerifyRef.current = false;
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [isApproved]);

  const handleClose = useCallback(() => {
    pendingVerifyRef.current = false;
    setVisible(false);
    navigation?.goBack?.();
  }, [navigation]);

  const handleVerify = useCallback(() => {
    // CTA Modal dismiss 완료 후 request (iOS Modal 중첩 방지)
    pendingVerifyRef.current = true;
    setVisible(false);
  }, []);

  const handleDismissed = useCallback(() => {
    if (!pendingVerifyRef.current) return;
    pendingVerifyRef.current = false;
    shell?.requestStudentVerification?.({
      reason,
      statusHint: studentVerificationStatus,
    });
    navigation?.goBack?.();
  }, [navigation, reason, shell, studentVerificationStatus]);

  const Gate = useMemo(() => {
    function StudentVerificationGate() {
      return (
        <View style={gateStyles.root}>
          <StudentVerificationCtaModal
            visible={visible && !isApproved}
            status={studentVerificationStatus || 'UNVERIFIED'}
            message={message}
            onClose={handleClose}
            onPressVerify={handleVerify}
            onDismissed={handleDismissed}
          />
        </View>
      );
    }
    return StudentVerificationGate;
  }, [
    visible,
    isApproved,
    studentVerificationStatus,
    message,
    handleClose,
    handleVerify,
    handleDismissed,
  ]);

  return { allowed: isApproved, Gate };
}

const gateStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
