import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
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
import SignupStepScroll from './SignupStepScroll';
import SchoolSearchField from './SchoolSearchField';
import SignupHelperText from './SignupHelperText';

const SMS_RESEND_COOLDOWN_SEC = 60;

function parseBirthParts(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { year: '', month: '', day: '' };
  }
  const [year, month, day] = birthDate.split('-');
  return { year, month, day };
}

const SignStepIdentity = ({
  styles,
  normalize,
  bottomOffset,
  initialData,
  selectedSchool,
  onSchoolSelect,
  onChange,
}) => {
  const initialParts = parseBirthParts(initialData?.birthDate);
  const [name, setName] = useState(initialData?.name || '');
  const [year, setYear] = useState(initialParts.year);
  const [month, setMonth] = useState(initialParts.month);
  const [day, setDay] = useState(initialParts.day);
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(Boolean(initialData?.isCodeSent));
  const [isVerified, setIsVerified] = useState(Boolean(initialData?.isVerified));
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  const confirmResultRef = useRef(null);
  /** 인증 완료 시점 스냅샷 — 이름·전화 변경 시 인증 초기화 */
  const verifiedSnapshotRef = useRef(
    initialData?.isVerified
      ? {
          name: (initialData?.name || '').trim(),
          phoneNumber: initialData?.phoneNumber || '',
        }
      : null,
  );

  const birthDate = buildBirthDate(year, month, day);
  const isPhoneReady = phoneNumber.replace(/\D/g, '').length >= 10;
  const isBusy = sendingCode || verifyingCode;

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

  const resetPhoneVerification = (reason) => {
    setIsVerified(false);
    setIsCodeSent(false);
    setVerificationCode('');
    confirmResultRef.current = null;
    verifiedSnapshotRef.current = null;
    notifyChange({
      isVerified: false,
      isCodeSent: false,
      verificationCode: '',
    });
    if (reason === 'identity_changed') {
      Alert.alert(
        '알림',
        '이름 또는 전화번호가 변경되어 전화번호 인증을 다시 진행해 주세요.',
      );
    }
  };

  useEffect(() => {
    if (!isVerified || !verifiedSnapshotRef.current) return;
    const snap = verifiedSnapshotRef.current;
    const nameChanged = name.trim() !== snap.name;
    const phoneChanged =
      normalizeLocalKrPhone(phoneNumber) !==
      normalizeLocalKrPhone(snap.phoneNumber);
    if (nameChanged || phoneChanged) {
      resetPhoneVerification('identity_changed');
    }
  }, [name, phoneNumber, isVerified]);

  useEffect(() => {
    if (resendCooldownSec <= 0) return undefined;
    const t = setInterval(() => {
      setResendCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldownSec]);

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
    if (error?.response?.status === 429) {
      return (
        error?.response?.data?.message ||
        '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
      );
    }
    return error?.message || '전화번호 인증 중 오류가 발생했습니다.';
  };

  const handleSendCode = async () => {
    if (isBusy || isVerified) return;
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!birthDate) {
      Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
      return;
    }
    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해 주세요.');
      return;
    }
    if (resendCooldownSec > 0) return;

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
      setResendCooldownSec(SMS_RESEND_COOLDOWN_SEC);
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
    if (isBusy || isVerified) return;
    if (!name.trim() || !birthDate) {
      Alert.alert('알림', '이름과 생년월일을 먼저 입력해 주세요.');
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
      verifiedSnapshotRef.current = {
        name: name.trim(),
        phoneNumber: verifiedPhone,
      };
      notifyChange({
        isVerified: true,
        name: name.trim(),
        birthDate,
        phoneNumber: verifiedPhone,
      });
      Alert.alert('알림', '전화번호 인증이 완료되었습니다.');
    } catch (error) {
      console.warn(
        '[SignStepIdentity] verifyCode',
        error?.code || error?.response?.data || error,
      );
      const msg =
        error?.response?.data?.message ||
        mapFirebaseError(error) ||
        '인증번호 확인 중 오류가 발생했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setVerifyingCode(false);
    }
  };

  const sendButtonLabel = () => {
    if (sendingCode) return null;
    if (isVerified) return '완료';
    if (resendCooldownSec > 0) return `${resendCooldownSec}초`;
    return isCodeSent ? '재발송' : '인증';
  };

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        <Text style={styles.inputLabel}>이름</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              notifyChange({ name: t.trim(), birthDate });
            }}
            placeholderTextColor={colors.textSecondary}
            editable={!isBusy}
          />
        </View>

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>생년월일</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1.2 }}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 4);
                  setYear(v);
                  notifyChange({ birthDate: buildBirthDate(v, month, day) });
                }}
                keyboardType="number-pad"
                maxLength={4}
                editable={!isBusy}
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
                  notifyChange({ birthDate: buildBirthDate(year, v, day) });
                }}
                keyboardType="number-pad"
                maxLength={2}
                editable={!isBusy}
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
                  notifyChange({ birthDate: buildBirthDate(year, month, v) });
                }}
                keyboardType="number-pad"
                maxLength={2}
                editable={!isBusy}
              />
            </View>
          </View>
        </View>

        <SchoolSearchField
          styles={styles}
          normalize={normalize}
          selectedSchool={selectedSchool}
          onSelect={onSchoolSelect}
          disabled={isBusy || isVerified}
        />

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>전화번호</Text>
        <View style={[styles.inputWrapper, styles.inputRow]}>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              value={phoneNumber}
              onChangeText={(t) => {
                setPhoneNumber(t);
                notifyChange({ phoneNumber: t });
              }}
              keyboardType="phone-pad"
              placeholderTextColor={colors.textSecondary}
              editable={!isVerified && !isBusy}
            />
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isPhoneReady ||
                  isBusy ||
                  isVerified ||
                  resendCooldownSec > 0) && {
                  backgroundColor: colors.textLight10,
                },
              ]}
              onPress={handleSendCode}
              disabled={
                !isPhoneReady ||
                isBusy ||
                isVerified ||
                resendCooldownSec > 0
              }
            >
              {sendingCode ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.verifyButtonText}>{sendButtonLabel()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>인증번호</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={verificationCode}
            onChangeText={(t) => {
              setVerificationCode(t);
              notifyChange({ verificationCode: t });
            }}
            keyboardType="number-pad"
            editable={isCodeSent && !isVerified && !isBusy}
          />
        </View>
        {isCodeSent && !isVerified ? (
          <TouchableOpacity
            style={[
              styles.verifyButton,
              { marginTop: 8 },
              isBusy && { opacity: 0.6 },
            ]}
            onPress={handleVerifyCode}
            disabled={isBusy}
          >
            {verifyingCode ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.verifyButtonText}>인증 확인</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {isVerified ? (
          <SignupHelperText normalize={normalize} variant="success">
            전화번호 인증이 완료되었습니다.
          </SignupHelperText>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

export default SignStepIdentity;
