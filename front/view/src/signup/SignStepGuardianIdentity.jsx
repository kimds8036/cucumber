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
import {
  fetchInicisServerEnabled,
  isInicisClientEnabled,
  runInicisIdentityFlow,
} from '../../../services/inicisAuth';

/** 보호자 본인인증 — 플래그 ON 시 이니시스, 아니면 mock */
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
      const clientOn = isInicisClientEnabled();
      const serverOn = clientOn ? await fetchInicisServerEnabled() : false;
      const useReal = clientOn && serverOn;

      if (useReal) {
        const result = await runInicisIdentityFlow('guardian_consent');
        const verifiedAt = new Date().toISOString();
        setIsVerified(true);
        onChange?.({
          isVerified: true,
          guardianVerifiedAt: verifiedAt,
          inicisClientToken: result.clientToken,
          guardianProfile: result.profile,
        });
        Alert.alert('알림', '보호자 본인인증이 완료되었습니다.');
        return;
      }

      await new Promise((r) => setTimeout(r, 400));
      const verifiedAt = new Date().toISOString();
      setIsVerified(true);
      onChange?.({ isVerified: true, guardianVerifiedAt: verifiedAt });
      Alert.alert('알림', '보호자 본인인증이 완료되었습니다. (테스트 mock)');
    } catch (e) {
      if (e?.code === 'CANCELLED') return;
      if (e?.code === 'IN_PROGRESS') {
        Alert.alert('알림', '이미 본인인증이 진행 중입니다.');
        return;
      }
      if (e?.code === 'SESSION_START_FAILED' || e?.code === 'POLL_FAILED') {
        onVerificationFailed?.();
        Alert.alert(
          '본인인증 오류',
          e?.message || '보호자 본인인증을 진행할 수 없습니다.',
        );
        return;
      }
      if (e?.code === 'TIMEOUT') {
        Alert.alert(
          '본인인증 대기',
          '인증이 완료되었다면 브라우저 왼쪽 상단 ✕를 눌러 앱으로 돌아와 주세요.',
        );
        return;
      }
      onVerificationFailed?.();
      Alert.alert('오류', e?.message || '보호자 인증에 실패했습니다.');
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
        ) : verifying ? (
          <Text style={[styles.fieldHelperText, { marginTop: normalize(12) }]}>
            인증이 끝나면 브라우저 왼쪽 상단 ✕를 눌러 앱으로 돌아와 주세요.
          </Text>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

export default SignStepGuardianIdentity;
