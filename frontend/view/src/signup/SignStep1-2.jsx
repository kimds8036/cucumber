import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

const SignStep1_2 = ({ styles, normalize, onChange, disableValidation = false }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const isPhoneReadyForVerification = phoneNumber.replace(/\D/g, '').length === 11;

  const notifyChange = (override = {}) => {
    onChange &&
      onChange({
        guardianPhoneNumber: phoneNumber,
        guardianVerificationCode: verificationCode,
        guardianIsCodeSent: isCodeSent,
        guardianIsVerified: isVerified,
        ...override,
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
          >
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
