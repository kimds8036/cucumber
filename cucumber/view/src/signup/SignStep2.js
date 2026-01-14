import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../../styles/colors';

const SignStep2 = ({ styles, normalize, onNext }) => {
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

  const handleNext = () => {
    // 추후 인증번호 확인 로직 추가
    if (phoneNumber && verificationCode) {
      onNext({
        phoneNumber,
        verificationCode,
      });
    }
  };

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.description}>사용자 확인을 위한 인증 안내입니다.</Text>

      {/* 전화번호 */}
      <Text style={styles.inputLabel}>전화번호</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.inputWithButton}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="전화번호"
            placeholderTextColor={colors.textSecondary}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
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
          placeholder="인증번호"
          placeholderTextColor={colors.textSecondary}
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          editable={isCodeSent}
        />
      </View>

      {/* 다음 단계 버튼 */}
      <View style={styles.nextButtonWrapper}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>다음 단계</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignStep2;
