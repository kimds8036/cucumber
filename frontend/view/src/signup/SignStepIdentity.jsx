import React, { useRef, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';
import { buildBirthDate } from './SignStepAgeGate';
import {
  requestPhoneVerification,
  confirmPhoneVerification,
} from '../../../utils/firebasePhoneAuth';
import { e164ToLocalKr, normalizeLocalKrPhone } from '../../../utils/phoneFormat';

/**
 * Step 1 (v2): 이름 · 생년월일 · 전화번호 인증 (Firebase Phone Auth)
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
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const confirmResultRef = useRef(null);

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

  const mapFirebaseError = (error) => {
    const code = error?.code || '';
    if (code === 'auth/invalid-phone-number') {
      return '올바른 전화번호 형식이 아닙니다.';
    }
    if (code === 'auth/too-many-requests') {
      return '인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code === 'auth/invalid-verification-code') {
      return '인증번호가 올바르지 않습니다.';
    }
    if (code === 'auth/code-expired') {
      return '인증번호가 만료되었습니다. 다시 요청해 주세요.';
    }
    return error?.message || '전화번호 인증 중 오류가 발생했습니다.';
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

    setSendingCode(true);
    try {
      const normalized = normalizeLocalKrPhone(phoneNumber);
      if (!normalized || normalized.replace(/\D/g, '').length < 10) {
        Alert.alert('알림', '전화번호를 올바르게 입력해 주세요.');
        return;
      }

      const dupRes = await api.post('/api/auth/check-phone-available', {
        phone: normalized,
      });
      if (!dupRes.data?.data?.available) {
        Alert.alert('알림', '이미 가입된 전화번호입니다.');
        return;
      }

      confirmResultRef.current = await requestPhoneVerification(normalized);
      setPhoneNumber(normalized);
      setIsCodeSent(true);
      notifyChange({ isCodeSent: true, phoneNumber: normalized });
      Alert.alert('알림', '인증 코드가 발송되었습니다.');
    } catch (error) {
      console.warn('[SignStepIdentity] sendCode', error?.code || error);
      Alert.alert('오류', mapFirebaseError(error));
    } finally {
      setSendingCode(false);
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
    if (!confirmResultRef.current) {
      Alert.alert('알림', '먼저 인증번호를 요청해 주세요.');
      return;
    }

    setVerifyingCode(true);
    try {
      const { idToken, phoneE164 } = await confirmPhoneVerification(
        confirmResultRef.current,
        verificationCode,
      );

      const normalizedInput = normalizeLocalKrPhone(phoneNumber);
      const res = await api.post('/api/auth/verify-firebase-phone', {
        idToken,
        phone: normalizedInput,
      });
      const verifiedPhone =
        res.data?.data?.phone || e164ToLocalKr(phoneE164) || phoneNumber;

      setIsVerified(true);
      setPhoneNumber(verifiedPhone);
      notifyChange({
        isVerified: true,
        name: name.trim(),
        birthDate,
        phoneNumber: verifiedPhone,
      });
      Alert.alert('알림', '전화번호 인증이 완료되었습니다.');
    } catch (error) {
      console.warn('[SignStepIdentity] verifyCode', error?.code || error?.response?.data || error);
      const msg =
        error?.response?.data?.message ||
        mapFirebaseError(error) ||
        '인증번호 확인 중 오류가 발생했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setVerifyingCode(false);
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
                  editable={!isVerified}
                />
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    (!isPhoneReady || sendingCode || isVerified) && {
                      backgroundColor: colors.textLight10,
                    },
                  ]}
                  onPress={handleSendCode}
                  disabled={!isPhoneReady || sendingCode || isVerified}
                >
                  {sendingCode ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.verifyButtonText}>인증</Text>
                  )}
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
                editable={isCodeSent && !isVerified}
                placeholder="6자리"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {isCodeSent && !isVerified ? (
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { marginTop: normalize(8) },
                  verifyingCode && { opacity: 0.6 },
                ]}
                onPress={handleVerifyCode}
                disabled={verifyingCode}
              >
                {verifyingCode ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.verifyButtonText}>인증 확인</Text>
                )}
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
