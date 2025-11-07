import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import { Header } from '../components/Header';
import { CustomInput } from '../components/CustomInput';
import { PhoneInput } from '../components/PhoneInput';
import { Button } from '../components/Button';

const SignupScreen = () => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleBack = () => {
    console.log('Go back');
  };

  const handleVerification = () => {
    console.log('Send verification code');
  };

  const handleSignup = () => {
    console.log('Signup:', { name, id, password, phone, verificationCode });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <Header title="회원가입" onBack={handleBack} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          학생 인증 및 기타 인증에 필요한 중요한 정보입니다.
        </Text>

        <View style={styles.form}>
          <CustomInput placeholder="이름" value={name} onChangeText={setName} />
          <CustomInput placeholder="아이디" value={id} onChangeText={setId} />
          <CustomInput placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
          <CustomInput placeholder="비밀번호 확인" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
          
          <PhoneInput
            placeholder="전화번호"
            value={phone}
            onChangeText={setPhone}
            buttonText="인증"
            onButtonPress={handleVerification}
          />
          
          <CustomInput placeholder="인증번호" value={verificationCode} onChangeText={setVerificationCode} />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="회원가입 완료" onPress={handleSignup} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  description: {
    color: COLORS.placeholder,
    fontSize: 12,
    marginTop: 15,
    marginBottom: 30,
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default SignupScreen;