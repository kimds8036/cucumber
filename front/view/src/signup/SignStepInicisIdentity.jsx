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

const INICIS_MOCK_PHONE = '01000000000';

/** 학생 본인인증 (KG 이니시스 연동 예정 — 1차 스텁) */
const SignStepInicisIdentity = ({
  styles,
  normalize,
  bottomOffset,
  initialData,
  selectedSchool,
  onSchoolSelect,
  onChange,
  requiresGuardianVerification = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [isVerified, setIsVerified] = useState(Boolean(initialData?.isVerified));
  const [verifying, setVerifying] = useState(false);

  const notifyChange = (override = {}) => {
    onChange?.({
      name: name.trim(),
      phoneNumber: initialData?.phoneNumber || INICIS_MOCK_PHONE,
      isVerified,
      ...override,
    });
  };

  const handleVerify = async () => {
    if (verifying || isVerified) return;
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!selectedSchool?.id) {
      Alert.alert('알림', '재학 중인 학교를 선택해 주세요.');
      return;
    }

    setVerifying(true);
    try {
      // TODO: KG 이니시스 학생 본인인증 API 연동
      await new Promise((r) => setTimeout(r, 400));
      setIsVerified(true);
      notifyChange({
        name: name.trim(),
        phoneNumber: INICIS_MOCK_PHONE,
        isVerified: true,
      });
      Alert.alert('알림', '본인인증이 완료되었습니다.');
    } catch {
      Alert.alert('오류', '본인인증 중 오류가 발생했습니다.');
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
            보호자 인증이 완료되었습니다. 이제 학생 본인인증을 진행해 주세요.
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
            placeholderTextColor={colors.textSecondary}
            editable={!isVerified && !verifying}
          />
        </View>

        <SchoolSearchField
          styles={styles}
          normalize={normalize}
          selectedSchool={selectedSchool}
          onSelect={onSchoolSelect}
          disabled={isVerified || verifying}
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            { marginTop: normalize(16) },
            (verifying || isVerified) && { opacity: isVerified ? 0.7 : 0.6 },
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
