import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';
import {
  requestPhoneVerification,
  confirmPhoneVerification,
} from '../../../utils/firebasePhoneAuth';
import { e164ToLocalKr, normalizeLocalKrPhone } from '../../../utils/phoneFormat';

const SMS_RESEND_COOLDOWN_SEC = 60;

/**
 * 아이디/비밀번호 찾기 공통 Firebase 전화 인증 필드
 * - 가입 전용 check-phone-available 대신 recovery/check-phone-registered 사용
 */
const RecoveryPhoneFields = ({
  styles,
  normalize,
  name,
  phoneNumber,
  onPhoneChange,
  isVerified,
  onVerified,
  phoneEditable = true,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);
  const [verifiedPhone, setVerifiedPhone] = useState(
    isVerified ? phoneNumber : '',
  );

  const confirmResultRef = useRef(null);
  const verifiedSnapshotRef = useRef(
    isVerified ? { phoneNumber: phoneNumber || '' } : null,
  );

  const isPhoneReady = phoneNumber.replace(/\D/g, '').length >= 10;
  const isBusy = sendingCode || verifyingCode;

  useEffect(() => {
    if (!isVerified || !verifiedSnapshotRef.current) return;
    const phoneChanged =
      normalizeLocalKrPhone(phoneNumber) !==
      normalizeLocalKrPhone(verifiedSnapshotRef.current.phoneNumber);
    if (phoneChanged) {
      setIsCodeSent(false);
      setVerificationCode('');
      confirmResultRef.current = null;
      verifiedSnapshotRef.current = null;
      setVerifiedPhone('');
      onVerified?.({ isVerified: false, phoneNumber, idToken: null });
      Alert.alert(
        '알림',
        '전화번호가 변경되어 인증을 다시 진행해 주세요.',
      );
    }
  }, [phoneNumber, isVerified, onVerified]);

  useEffect(() => {
    if (resendCooldownSec <= 0) return undefined;
    const t = setInterval(() => {
      setResendCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldownSec]);

  const mapFirebaseError = (error) => {
    const code = error?.code || '';
    if (code === 'auth/invalid-phone-number') {
      return '올바른 전화번호 형식이 아닙니다.';
    }
    if (code === 'auth/too-many-requests') {
      return '인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code === 'auth/invalid-verification-code') {
      return '인증번호가 올바르지 않습니다.';
    }
    if (code === 'auth/code-expired') {
      return '인증번호가 만료되었습니다. 다시 요청해 주세요.';
    }
    if (error?.response?.status === 429) {
      return (
        error?.response?.data?.message ||
        '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
      );
    }
    return error?.message || '전화번호 인증 중 오류가 발생했습니다.';
  };

  const handleSendCode = async () => {
    if (isBusy || isVerified) return;
    if (!name?.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해 주세요.');
      return;
    }
    if (resendCooldownSec > 0) return;

    setSendingCode(true);
    try {
      const normalized = normalizeLocalKrPhone(phoneNumber);
      if (!normalized || normalized.replace(/\D/g, '').length < 10) {
        Alert.alert('알림', '전화번호를 올바르게 입력해 주세요.');
        return;
      }

      const regRes = await api.post('/api/auth/recovery/check-phone-registered', {
        phone: normalized,
      });
      if (!regRes.data?.data?.registered) {
        Alert.alert(
          '알림',
          '가입된 전화번호가 아닙니다. 가입 시 사용한 번호를 입력해 주세요.',
        );
        return;
      }

      confirmResultRef.current = await requestPhoneVerification(normalized);
      onPhoneChange?.(normalized);
      setIsCodeSent(true);
      setResendCooldownSec(SMS_RESEND_COOLDOWN_SEC);
      Alert.alert('알림', '인증 코드가 발송되었습니다.');
    } catch (error) {
      console.warn('[RecoveryPhoneFields] sendCode', error?.code || error);
      Alert.alert('오류', mapFirebaseError(error));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (isBusy || isVerified) return;
    if (!name?.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!phoneNumber || !verificationCode) {
      Alert.alert('알림', '전화번호와 인증번호를 입력해 주세요.');
      return;
    }
    if (!confirmResultRef.current) {
      Alert.alert('알림', '먼저 인증번호를 요청해 주세요.');
      return;
    }

    setVerifyingCode(true);
    try {
      const { idToken, phoneE164 } = await confirmPhoneVerification(
        confirmResultRef.current,
        verificationCode,
      );

      const normalizedInput = normalizeLocalKrPhone(phoneNumber);
      const res = await api.post('/api/auth/verify-firebase-phone', {
        idToken,
        phone: normalizedInput,
      });
      const phone =
        res.data?.data?.phone || e164ToLocalKr(phoneE164) || phoneNumber;

      verifiedSnapshotRef.current = { phoneNumber: phone };
      setVerifiedPhone(phone);
      onPhoneChange?.(phone);
      onVerified?.({ isVerified: true, phoneNumber: phone, idToken });
    } catch (error) {
      console.warn(
        '[RecoveryPhoneFields] verifyCode',
        error?.code || error?.response?.data || error,
      );
      const msg =
        error?.response?.data?.message ||
        mapFirebaseError(error) ||
        '인증번호 확인 중 오류가 발생했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setVerifyingCode(false);
    }
  };

  const sendButtonLabel = () => {
    if (sendingCode) return null;
    if (isVerified) return '완료';
    if (resendCooldownSec > 0) return `${resendCooldownSec}초`;
    return isCodeSent ? '재발송' : '인증';
  };

  return (
    <>
      <Text style={styles.inputLabel}>전화번호</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.inputWithButton}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={phoneNumber}
            onChangeText={onPhoneChange}
            keyboardType="phone-pad"
            placeholder="01012345678"
            placeholderTextColor={colors.textSecondary}
            editable={phoneEditable && !isVerified && !isBusy}
          />
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!isPhoneReady ||
                isBusy ||
                isVerified ||
                resendCooldownSec > 0) && styles.verifyButtonDisabled,
            ]}
            onPress={handleSendCode}
            disabled={
              !isPhoneReady || isBusy || isVerified || resendCooldownSec > 0
            }
          >
            {sendingCode ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.verifyButtonText}>{sendButtonLabel()}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.inputLabel}>인증번호</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          editable={isCodeSent && !isVerified && !isBusy}
          placeholder="6자리"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {isCodeSent && !isVerified ? (
        <TouchableOpacity
          style={[styles.verifyButton, styles.verifyButtonWide, isBusy && { opacity: 0.6 }]}
          onPress={handleVerifyCode}
          disabled={isBusy}
        >
          {verifyingCode ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.verifyButtonText}>인증 확인</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {isVerified ? (
        <Text style={styles.verifiedHint}>
          전화번호 인증이 완료되었습니다.
          {verifiedPhone ? ` (${verifiedPhone})` : ''}
        </Text>
      ) : null}
    </>
  );
};

export default RecoveryPhoneFields;
