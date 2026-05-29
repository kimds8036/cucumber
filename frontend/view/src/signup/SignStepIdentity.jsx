import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';
import { buildBirthDate } from './SignStepAgeGate';

/**
 * Step 1 (v2): 이름 · 생년월일 · 전화번호 인증 (한 화면)
 */
const SignStepIdentity = ({
  styles,
  normalize,
  onChange,
  disableValidation = false,
}) => {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const birthDate = buildBirthDate(year, month, day);
  const isPhoneReady = phoneNumber.replace(/\D/g, '').length >= 10;

  const notifyChange = (override = {}) => {
    onChange?.({
      name: name.trim(),
      birthDate,
      phoneNumber,
      verificationCode,
      isCodeSent,
      isVerified,
      ...override,
    });
  };

  const handleSendCode = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!birthDate) {
      Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
      return;
    }
    if (disableValidation) {
      setIsCodeSent(true);
      notifyChange({ isCodeSent: true });
      return;
    }
    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해 주세요.');
      return;
    }
    try {
      await api.post('/api/auth/send-verification', { phone: phoneNumber });
      setIsCodeSent(true);
      notifyChange({ isCodeSent: true });
      Alert.alert('알림', '인증 코드가 발송되었습니다.');
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message ||
          '인증 코드 발송 중 오류가 발생했습니다.',
      );
    }
  };

  const handleVerifyCode = async () => {
    if (!name.trim() || !birthDate) {
      Alert.alert('알림', '이름과 생년월일을 먼저 입력해 주세요.');
      return;
    }
    if (disableValidation) {
      setIsVerified(true);
      notifyChange({
        isVerified: true,
        name: name.trim(),
        birthDate,
        phoneNumber,
      });
      return;
    }
    if (!phoneNumber || !verificationCode) {
      Alert.alert('알림', '전화번호와 인증번호를 입력해 주세요.');
      return;
    }
    try {
      await api.post('/api/auth/verify-phone', {
        phone: phoneNumber,
        verificationCode,
      });
      setIsVerified(true);
      notifyChange({
        isVerified: true,
        name: name.trim(),
        birthDate,
        phoneNumber,
      });
      Alert.alert('알림', '전화번호 인증이 완료되었습니다.');
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message ||
          '인증번호 확인 중 오류가 발생했습니다.',
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[styles.content, { flex: 1 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: normalize(24) }}
          >
            <Text style={[styles.inputLabel, { marginBottom: normalize(8) }]}>
              이름
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  notifyChange({ name: t.trim(), birthDate });
                }}
                placeholder="실명"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: normalize(12) }]}>
              생년월일
            </Text>
            <View style={{ flexDirection: 'row', gap: normalize(8) }}>
              <View style={{ flex: 1.2 }}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={year}
                    onChangeText={(t) => {
                      const v = t.replace(/\D/g, '').slice(0, 4);
                      setYear(v);
                      notifyChange({
                        birthDate: buildBirthDate(v, month, day),
                      });
                    }}
                    placeholder="2008"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={month}
                    onChangeText={(t) => {
                      const v = t.replace(/\D/g, '').slice(0, 2);
                      setMonth(v);
                      notifyChange({
                        birthDate: buildBirthDate(year, v, day),
                      });
                    }}
                    placeholder="01"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={day}
                    onChangeText={(t) => {
                      const v = t.replace(/\D/g, '').slice(0, 2);
                      setDay(v);
                      notifyChange({
                        birthDate: buildBirthDate(year, month, v),
                      });
                    }}
                    placeholder="01"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: normalize(16) }]}>
              전화번호
            </Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={phoneNumber}
                  onChangeText={(t) => {
                    setPhoneNumber(t);
                    notifyChange({ phoneNumber: t });
                  }}
                  keyboardType="phone-pad"
                  placeholder="01012345678"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    !isPhoneReady && { backgroundColor: colors.textLight10 },
                  ]}
                  onPress={handleSendCode}
                  disabled={!isPhoneReady}
                >
                  <Text style={styles.verifyButtonText}>인증</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: normalize(12) }]}>
              인증번호
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={verificationCode}
                onChangeText={(t) => {
                  setVerificationCode(t);
                  notifyChange({ verificationCode: t });
                }}
                keyboardType="number-pad"
                editable={isCodeSent}
                placeholder="6자리"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {isCodeSent ? (
              <TouchableOpacity
                style={[styles.verifyButton, { marginTop: normalize(8) }]}
                onPress={handleVerifyCode}
              >
                <Text style={styles.verifyButtonText}>인증 확인</Text>
              </TouchableOpacity>
            ) : null}

            {isVerified ? (
              <Text
                style={{
                  marginTop: normalize(12),
                  color: colors.primary,
                  fontFamily: 'Baloo2-Regular',
                  fontSize: normalize(13),
                }}
              >
                전화번호 인증이 완료되었습니다.
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default SignStepIdentity;
