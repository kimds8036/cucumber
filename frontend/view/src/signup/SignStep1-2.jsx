import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

// 회원가입 2단계(14세 미만): 보호자 PASS 인증 화면
const SignStep1_2 = ({ styles, normalize, onChange, disableValidation = false }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  /** 법정대리인 고지 확인: null | 'na'(만 14세 이상 해당 없음) | 'guardian'(동의) */
  const [guardianLegalAck, setGuardianLegalAck] = useState(null);
  const isPhoneReadyForVerification = phoneNumber.replace(/\D/g, '').length === 11;

  const notifyChange = (override = {}) => {
    onChange &&
      onChange({
        guardianPhoneNumber: phoneNumber,
        guardianVerificationCode: verificationCode,
        guardianIsCodeSent: isCodeSent,
        guardianIsVerified: isVerified,
        guardianLegalAck: guardianLegalAck,
        ...override,
      });
  };

  const selectLegalAck = (value) => {
    setGuardianLegalAck((prev) => {
      const next = prev === value ? null : value;
      onChange?.({
        guardianPhoneNumber: phoneNumber,
        guardianVerificationCode: verificationCode,
        guardianIsCodeSent: isCodeSent,
        guardianIsVerified: isVerified,
        guardianLegalAck: next,
      });
      return next;
    });
  };

  const handleSendCode = async () => {
    if (disableValidation) {
      setIsCodeSent(true);
      notifyChange({ guardianIsCodeSent: true });
      return;
    }

    if (!phoneNumber) {
      Alert.alert('알림', '보호자 전화번호를 입력해주세요.');
      return;
    }

    try {
      await api.post('/api/auth/send-verification', { phone: phoneNumber });
      setIsCodeSent(true);
      notifyChange({ guardianIsCodeSent: true });
      Alert.alert('알림', '인증 코드가 발송되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('오류', error.response?.data?.message || '인증 코드 발송 중 오류가 발생했습니다.');
    }
  };

  const handleVerifyCode = async () => {
    if (disableValidation) {
      setIsVerified(true);
      notifyChange({ guardianIsVerified: true });
      return;
    }

    if (!phoneNumber || !verificationCode) {
      Alert.alert('알림', '전화번호와 인증번호를 모두 입력해주세요.');
      return;
    }

    try {
      await api.post('/api/auth/verify-phone', {
        phone: phoneNumber,
        verificationCode,
      });
      setIsVerified(true);
      notifyChange({ guardianIsVerified: true });
      Alert.alert('알림', '보호자 본인인증이 완료되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('오류', error.response?.data?.message || '인증번호 확인 중 오류가 발생했습니다.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[styles.content, { flex: 1 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: normalize(10),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View
              style={{
                width: '98%',
                alignSelf: 'center',
                marginBottom: normalize(18),
                paddingHorizontal: normalize(14),
                paddingVertical: normalize(14),
                borderRadius: normalize(16),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: normalize(13),
                  color: colors.textPrimary,
                  fontWeight: '700',
                  marginBottom: normalize(6),
                }}
              >
                [필수 3] 만 14세 미만 회원의 법정대리인 동의{' '}
                <Text style={{ fontWeight: '400', color: colors.textSecondary }}>(해당자만)</Text>
              </Text>
              <Text
                style={{
                  fontSize: normalize(12),
                  color: colors.textSecondary,
                  marginBottom: normalize(10),
                  lineHeight: normalize(18),
                }}
              >
                자세한 내용은 개인정보 처리방침 제1조·제6조를 참고하세요.
              </Text>
              <Text style={{ fontSize: normalize(12), color: colors.textPrimary, lineHeight: normalize(19) }}>
                · <Text style={{ fontWeight: '600' }}>수집</Text> 법정대리인 이름·연락처 등 법령상 필요한 최소 정보(실제
                항목은 가입 화면에서 안내){'\n'}
                · <Text style={{ fontWeight: '600' }}>목적</Text> 만 14세 미만 아동 정보 수집·이용에 대한 법정대리인
                동의 확인{'\n'}· <Text style={{ fontWeight: '600' }}>보관</Text> 동의 목적 달성 후 지체 없이 파기(별도
                법령 보존 제외)
              </Text>
              <Text
                style={{
                  fontSize: normalize(11),
                  color: colors.textSecondary,
                  marginTop: normalize(8),
                  marginBottom: normalize(10),
                }}
              >
                ※ 만 14세 이상이면 본 항목에 해당하지 않습니다.
              </Text>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: normalize(8) }}
                onPress={() => selectLegalAck('na')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={guardianLegalAck === 'na' ? 'checkbox' : 'square-outline'}
                  size={normalize(22)}
                  color={guardianLegalAck === 'na' ? colors.primaryDark : colors.textSecondary}
                  style={{ marginRight: normalize(8) }}
                />
                <Text style={{ flex: 1, fontSize: normalize(13), color: colors.textPrimary }}>
                  해당 없음 (만 14세 이상)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => selectLegalAck('guardian')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={guardianLegalAck === 'guardian' ? 'checkbox' : 'square-outline'}
                  size={normalize(22)}
                  color={guardianLegalAck === 'guardian' ? colors.primaryDark : colors.textSecondary}
                  style={{ marginRight: normalize(8) }}
                />
                <Text style={{ flex: 1, fontSize: normalize(13), color: colors.textPrimary }}>
                  법정대리인으로서 동의합니다
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.guardianInputLabel}>보호자 전화번호</Text>
            <View style={styles.guardianInputWrapper}>
              <View style={styles.guardianInputWithButton}>
                <TextInput
                  style={[styles.guardianInput, styles.guardianInputFlex]}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    notifyChange({ guardianPhoneNumber: text });
                  }}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[
                    styles.guardianVerifyButton,
                    !isPhoneReadyForVerification && { backgroundColor: colors.textLight10 },
                  ]}
                  onPress={handleSendCode}
                  disabled={!isPhoneReadyForVerification}
                >
                  <Text style={styles.guardianVerifyButtonText}>인증</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.guardianInputLabel}>인증번호</Text>
            <View style={styles.guardianInputWrapper}>
              <TextInput
                style={styles.guardianInput}
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text);
                  notifyChange({ guardianVerificationCode: text });
                }}
                keyboardType="number-pad"
                editable={isCodeSent}
              />
            </View>

            {isCodeSent && (
              <View style={styles.guardianInputWrapper}>
                <TouchableOpacity style={styles.guardianVerifyButton} onPress={handleVerifyCode}>
                  <Text style={styles.guardianVerifyButtonText}>인증 확인</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default SignStep1_2;
