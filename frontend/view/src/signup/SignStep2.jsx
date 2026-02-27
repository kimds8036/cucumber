import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../../styles/colors';

const SignStep2 = ({ styles, normalize }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);

  const handleSendCode = () => {
    // 추후 인증번호 발송 API 연동
    if (phoneNumber) {
      setIsCodeSent(true);
      // 인증번호 발송 로직
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
            onChangeText={setPhoneNumber}
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
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          editable={isCodeSent}
        />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignStep2;
