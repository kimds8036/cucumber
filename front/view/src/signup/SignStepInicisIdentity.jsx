import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../../../styles/colors';
import SignupStepScroll from './SignupStepScroll';
import SchoolSearchField from './SchoolSearchField';
import {
  fetchInicisServerEnabled,
  isInicisClientEnabled,
  runInicisIdentityFlow,
} from '../../../services/inicisAuth';

const INICIS_MOCK_PHONE = '01000000000';

/** 학생 본인인증 — INICIS 플래그 ON 시 실연동, 아니면 mock (유효성 SKIP 유지) */
const SignStepInicisIdentity = ({
  styles,
  normalize,
  bottomOffset,
  initialData,
  selectedSchool,
  onSchoolSelect,
  onChange,
  requiresGuardianVerification = false,
  testMode = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [isVerified, setIsVerified] = useState(
    testMode ? false : Boolean(initialData?.isVerified),
  );
  const [verifying, setVerifying] = useState(false);
  const [inicisToken, setInicisToken] = useState(
    initialData?.inicisClientToken || null,
  );

  const fieldsLocked = !testMode && (isVerified || verifying);

  const notifyChange = (override = {}) => {
    onChange?.({
      name: name.trim(),
      phoneNumber: initialData?.phoneNumber || INICIS_MOCK_PHONE,
      isVerified: testMode ? true : isVerified,
      inicisClientToken: inicisToken,
      ...override,
    });
  };

  const handleVerify = async () => {
    if (verifying || isVerified) return;

    const clientOn = isInicisClientEnabled();
    let serverOn = false;
    if (clientOn) {
      serverOn = await fetchInicisServerEnabled();
    }
    const useReal = clientOn && serverOn;

    // SKIP/testMode여도 실연동 플래그 ON이면 이니시스 창을 연다
    if (!useReal) {
      if (testMode) return; // 가입 SKIP 모드는 버튼 무반응(기존 UX) 유지
      // 기존 mock (유효성 미해제 단계)
      if (!name.trim()) {
        Alert.alert('알림', '이름을 입력해 주세요.');
        return;
      }
      if (!selectedSchool?.id) {
        Alert.alert('알림', '재학 중인 학교를 목록에서 선택해 주세요.');
        return;
      }
      setVerifying(true);
      try {
        await new Promise((r) => setTimeout(r, 400));
        setIsVerified(true);
        notifyChange({
          name: name.trim(),
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
      const nextName = profile.name || name.trim();
      if (nextName) setName(nextName);
      setInicisToken(result.clientToken);
      setIsVerified(true);
      notifyChange({
        name: nextName,
        phoneNumber: profile.phoneNumber || INICIS_MOCK_PHONE,
        birthDate: profile.birthDate,
        isVerified: true,
        inicisClientToken: result.clientToken,
      });
      Alert.alert('알림', '본인인증이 완료되었습니다.');
    } catch (e) {
      if (e?.code === 'CANCELLED') return;
      Alert.alert('오류', e?.message || '본인인증 중 오류가 발생했습니다.');
    } finally {
      setVerifying(false);
    }
  };

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
            보호자 인증이 완료되었습니다. 이제 학생 정보를 입력해 주세요.
          </Text>
        ) : null}

        <Text style={styles.inputLabel}>이름</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              notifyChange({ name: t.trim() });
            }}
            placeholder="이름"
            placeholderTextColor={colors.textSecondary}
            editable={!fieldsLocked}
          />
        </View>

        <SchoolSearchField
          styles={styles}
          normalize={normalize}
          selectedSchool={selectedSchool}
          onSelect={onSchoolSelect}
          disabled={fieldsLocked}
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            { marginTop: normalize(16) },
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
            본인인증이 완료되었습니다.
          </Text>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

export default SignStepInicisIdentity;
