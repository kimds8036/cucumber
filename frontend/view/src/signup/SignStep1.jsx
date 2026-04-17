import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

// 회원가입 1단계: 본인(PASS) 인증 정보 입력/검증 화면
const SignStep1 = ({ styles, normalize, onChange, disableValidation = false, passMode = false }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const isPhoneReadyForVerification = phoneNumber.replace(/\D/g, '').length === 11;

  const notifyChange = (override = {}) => {
    onChange &&
      onChange({
        phoneNumber,
        verificationCode,
        isCodeSent,
        isVerified,
        ...override,
      });
  };

  const handleSendCode = async () => {
    if (disableValidation) {
      setIsCodeSent(true);
      notifyChange({ isCodeSent: true });
      return;
    }

    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해주세요.');
      return;
    }

    try {
      await api.post('/api/auth/send-verification', { phone: phoneNumber });
      setIsCodeSent(true);
      notifyChange({ isCodeSent: true });
      Alert.alert('알림', '인증 코드가 발송되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('오류', error.response?.data?.message || '인증 코드 발송 중 오류가 발생했습니다.');
    }
  };

  const handleVerifyCode = async () => {
    if (disableValidation) {
      const mockedIdentity = {
        name: '홍길동',
        birthDate: '2008-01-01',
      };
      setIsVerified(true);
      notifyChange({ isVerified: true, ...mockedIdentity });
      return;
    }

    if (!phoneNumber || !verificationCode) {
      Alert.alert('알림', '전화번호와 인증번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await api.post('/api/auth/verify-phone', {
        phone: phoneNumber,
        verificationCode,
      });
      const identity = {
        name: response?.data?.data?.name || '',
        birthDate: response?.data?.data?.birthDate || '',
      };
      setIsVerified(true);
      notifyChange({ isVerified: true, ...identity });
      Alert.alert('알림', '전화번호 인증이 완료되었습니다.');
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
          >
      {/* 전화번호 */}
      <Text style={styles.inputLabel}>전화번호</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.inputWithButton}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              notifyChange({ phoneNumber: text });
            }}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[
              styles.verifyButton,
              !isPhoneReadyForVerification && { backgroundColor: colors.textLight10 },
            ]}
            onPress={handleSendCode}
            disabled={!isPhoneReadyForVerification}
          >
            <Text style={styles.verifyButtonText}>인증</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 인증번호 */}
      <Text style={styles.inputLabel}>인증번호</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={verificationCode}
          onChangeText={(text) => {
            setVerificationCode(text);
            notifyChange({ verificationCode: text });
          }}
          keyboardType="number-pad"
          editable={isCodeSent}
        />
      </View>
      {isCodeSent && (
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyCode}>
            <Text style={styles.verifyButtonText}>인증 확인</Text>
          </TouchableOpacity>
        </View>
      )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default SignStep1;
