import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../../../styles/colors';
import SignupStepScroll from './SignupStepScroll';

/** 보호자 본인인증 (KG 이니시스 연동 예정 — 1차 스텁) */
const SignStepGuardianIdentity = ({
  styles,
  normalize,
  bottomOffset,
  initialVerified = false,
  onChange,
  onVerificationFailed,
}) => {
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (verifying || isVerified) return;
    setVerifying(true);
    try {
      // TODO: KG 이니시스 보호자 본인인증 API 연동
      await new Promise((r) => setTimeout(r, 400));
      const verifiedAt = new Date().toISOString();
      setIsVerified(true);
      onChange?.({ isVerified: true, guardianVerifiedAt: verifiedAt });
      Alert.alert('알림', '보호자 본인인증이 완료되었습니다.');
    } catch {
      onVerificationFailed?.();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        <Text
          style={{
            fontFamily: 'Baloo2-Regular',
            fontSize: normalize(14),
            lineHeight: normalize(22),
            color: colors.textSecondary,
            marginBottom: normalize(16),
          }}
        >
          보호자(법정대리인) 명의의 휴대전화로 본인인증을 진행해 주세요.{'\n'}
          개인정보 수집·이용에 대한 법정대리인 동의가 포함됩니다.
        </Text>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (verifying || isVerified) && { opacity: isVerified ? 0.7 : 0.6 },
          ]}
          onPress={handleVerify}
          disabled={verifying || isVerified}
        >
          {verifying ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.verifyButtonText}>
              {isVerified ? '인증 완료' : '보호자 본인인증 하기'}
            </Text>
          )}
        </TouchableOpacity>

        {isVerified ? (
          <Text
            style={[styles.fieldHelperText, styles.fieldHelperTextSuccess]}
          >
            보호자 본인인증이 완료되었습니다.
          </Text>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

export default SignStepGuardianIdentity;
