import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const INICIS_MOCK_PHONE = '01000000000';

/** 학생 본인인증 — 생년월일 다음 KG 이니시스 간편인증 (이름·학교는 이 단계에서 받지 않음) */
const SignStepInicisIdentity = ({
  styles,
  normalize,
  bottomOffset,
  initialData,
  onChange,
  requiresGuardianVerification = false,
  testMode = false,
  autoStart = true,
}) => {
  const [isVerified, setIsVerified] = useState(
    testMode ? false : Boolean(initialData?.isVerified),
  );
  const [verifying, setVerifying] = useState(false);
  const [inicisToken, setInicisToken] = useState(
    initialData?.inicisClientToken || null,
  );
  const autoStartedRef = useRef(false);

  const notifyChange = useCallback(
    (override = {}) => {
      onChange?.({
        phoneNumber: initialData?.phoneNumber || INICIS_MOCK_PHONE,
        isVerified: testMode ? true : isVerified,
        inicisClientToken: inicisToken,
        ...override,
      });
    },
    [initialData?.phoneNumber, inicisToken, isVerified, onChange, testMode],
  );

  const handleVerify = useCallback(async () => {
    if (verifying || isVerified) return;

    const clientOn = isInicisClientEnabled();
    let serverOn = false;
    if (clientOn) {
      serverOn = await fetchInicisServerEnabled();
    }
    const useReal = clientOn && serverOn;

    if (!useReal) {
      if (testMode) return;
      setVerifying(true);
      try {
        await new Promise((r) => setTimeout(r, 400));
        setIsVerified(true);
        notifyChange({
          name: '테스트학생',
          phoneNumber: INICIS_MOCK_PHONE,
          isVerified: true,
        });
        Alert.alert('알림', '본인인증이 완료되었습니다. (테스트 mock)');
      } finally {
        setVerifying(false);
      }
      return;
    }

    setVerifying(true);
    try {
      const result = await runInicisIdentityFlow('student_signup');
      const profile = result.profile || {};
      const verifiedName = String(profile.name || '').trim();
      if (!verifiedName) {
        Alert.alert(
          '본인인증 오류',
          '인증은 완료되었으나 이름 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return;
      }
      setInicisToken(result.clientToken);
      setIsVerified(true);
      notifyChange({
        name: verifiedName,
        phoneNumber: profile.phoneNumber || INICIS_MOCK_PHONE,
        birthDate: profile.birthDate || initialData?.birthDate || null,
        isVerified: true,
        inicisClientToken: result.clientToken,
      });
    } catch (e) {
      if (e?.code === 'CANCELLED') return;
      if (e?.code === 'IN_PROGRESS') {
        Alert.alert('알림', '이미 본인인증이 진행 중입니다.');
        return;
      }
      if (e?.code === 'SESSION_START_FAILED' || e?.code === 'POLL_FAILED') {
        Alert.alert('본인인증 오류', e?.message || '본인인증을 진행할 수 없습니다.');
        return;
      }
      if (e?.code === 'TIMEOUT') {
        Alert.alert(
          '본인인증 대기',
          '인증 결과 확인에 시간이 걸리고 있습니다. 잠시 후 [본인인증 하기]를 다시 눌러 주세요.',
        );
        return;
      }
      Alert.alert('오류', e?.message || '본인인증 중 오류가 발생했습니다.');
    } finally {
      setVerifying(false);
    }
  }, [initialData?.birthDate, isVerified, notifyChange, testMode, verifying]);

  useEffect(() => {
    if (!autoStart || testMode || isVerified || verifying || autoStartedRef.current) {
      return;
    }
    autoStartedRef.current = true;
    handleVerify();
  }, [autoStart, handleVerify, isVerified, testMode, verifying]);

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        {requiresGuardianVerification ? (
          <Text
            style={{
              fontFamily: 'Baloo2-Regular',
              fontSize: normalize(13),
              color: colors.textSecondary,
              marginBottom: normalize(12),
            }}
          >
            보호자 인증이 완료되었습니다. 이제 학생 본인인증을 진행해 주세요.
          </Text>
        ) : null}

        <Text
          style={{
            fontFamily: 'Baloo2-Regular',
            fontSize: normalize(14),
            color: colors.textSecondary,
            lineHeight: normalize(20),
            marginBottom: normalize(16),
          }}
        >
          KG 이니시스 간편인증으로 본인 확인을 진행합니다. 인증 창에 표시되는 이름·
          생년월일 정보가 가입 정보로 사용됩니다.
        </Text>

        {initialData?.name && isVerified ? (
          <Text
            style={[styles.fieldHelperText, styles.fieldHelperTextSuccess, { marginBottom: normalize(12) }]}
          >
            인증된 이름: {initialData.name}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.verifyButton,
            { marginTop: normalize(8) },
            (verifying || isVerified) && {
              opacity: isVerified ? 0.7 : 0.6,
            },
          ]}
          onPress={handleVerify}
          disabled={verifying || isVerified}
        >
          {verifying ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.verifyButtonText}>
              {isVerified ? '인증 완료' : '본인인증 하기'}
            </Text>
          )}
        </TouchableOpacity>

        {isVerified ? (
          <Text
            style={[styles.fieldHelperText, styles.fieldHelperTextSuccess]}
          >
            본인인증이 완료되었습니다. 다음 단계로 진행해 주세요.
          </Text>
        ) : verifying ? (
          <Text style={[styles.fieldHelperText, { marginTop: normalize(12) }]}>
            인증 창이 열립니다. 완료 후 앱으로 돌아오면 자동으로 확인됩니다.
          </Text>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

export default SignStepInicisIdentity;
