import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

const SignStep2 = ({ styles, normalize, onChange }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

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
      notifyChange({ isVerified: true });
      Alert.alert('알림', '전화번호 인증이 완료되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('오류', error.response?.data?.message || '인증번호 확인 중 오류가 발생했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.content}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
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
          <TouchableOpacity style={styles.verifyButton} onPress={handleSendCode}>
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
  );
};

export default SignStep2;
