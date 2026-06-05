import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../styles/colors';
import { createFindStyles } from '../../../styles/find.style';
import { CommonActions } from '@react-navigation/native';
import Skeleton from '../../../components/common/Skeleton';
import { api } from '../../../utils/api';
import RecoveryPhoneFields from './RecoveryPhoneFields';
import SignupStepScroll from './SignupStepScroll';

const PWfind = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = useMemo(() => createFindStyles(width, normalize), [width]);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneIdToken, setPhoneIdToken] = useState(null);
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [step, setStep] = useState(1);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [screenReady, setScreenReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 220);
    return () => clearTimeout(timer);
  }, []);

  const goToLogin = () => {
    navigation?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };

  const resetVerification = () => {
    setIsPhoneVerified(false);
    setPhoneIdToken(null);
    setRecoveryToken(null);
    setVerifiedUser(null);
  };

  const handleIdentityFieldChange = (setter) => (value) => {
    setter(value);
    if (isPhoneVerified || recoveryToken) {
      resetVerification();
    }
  };

  const canResetPassword =
    newPassword.length > 0 && newPasswordConfirm.length > 0;

  const handlePhoneVerified = async ({ isVerified, phoneNumber: phone, idToken }) => {
    setIsPhoneVerified(isVerified);
    setPhoneNumber(phone);
    setPhoneIdToken(idToken);

    if (!isVerified) {
      setRecoveryToken(null);
      setVerifiedUser(null);
      return;
    }

    if (!name.trim() || !username.trim()) {
      Alert.alert('알림', '이름과 아이디를 입력해 주세요.');
      resetVerification();
      return;
    }

    setCheckingUser(true);
    try {
      const res = await api.post('/api/auth/recovery/verify-account', {
        idToken,
        phone,
        name: name.trim(),
        username: username.trim(),
      });
      const data = res.data?.data;
      if (!data?.recoveryToken) {
        Alert.alert('알림', '본인 확인에 실패했습니다.');
        resetVerification();
        return;
      }
      setRecoveryToken(data.recoveryToken);
      setVerifiedUser({
        name: data.name,
        username: data.username,
        phone: data.phone,
      });
      setStep(2);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        '입력한 정보와 일치하는 사용자를 찾지 못했습니다.';
      Alert.alert('확인 실패', msg);
      resetVerification();
    } finally {
      setCheckingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!canResetPassword) {
      Alert.alert('알림', '새 비밀번호 정보를 모두 입력해주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert('알림', '새 비밀번호와 확인 값이 일치하지 않습니다.');
      return;
    }
    if (!recoveryToken || !verifiedUser) {
      Alert.alert('알림', '본인 확인을 먼저 완료해 주세요.');
      return;
    }

    setResetting(true);
    try {
      await api.post('/api/auth/recovery/reset-password', {
        recoveryToken,
        phone: verifiedUser.phone,
        username: verifiedUser.username,
        newPassword,
      });

      Alert.alert('완료', '비밀번호가 변경되었습니다.', [
        { text: '로그인하기', onPress: goToLogin },
      ]);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        '비밀번호 변경 중 오류가 발생했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setResetting(false);
    }
  };

  if (!screenReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <Skeleton
              width={normalize(24)}
              height={normalize(24)}
              borderRadius={normalize(12)}
            />
            <Skeleton
              width={normalize(96)}
              height={normalize(18)}
              borderRadius={normalize(8)}
            />
          </View>
          <Skeleton
            width="72%"
            height={normalize(14)}
            borderRadius={normalize(6)}
            style={{ marginTop: normalize(10) }}
          />
        </View>
        <View style={styles.contentSection}>
          {[0, 1].map((idx) => (
            <View
              key={`pwfind-skel-${idx}`}
              style={{ marginBottom: normalize(18) }}
            >
              <Skeleton
                width={normalize(70)}
                height={normalize(12)}
                borderRadius={normalize(6)}
                style={{ marginBottom: normalize(8) }}
              />
              <Skeleton
                width="100%"
                height={normalize(48)}
                borderRadius={normalize(12)}
              />
            </View>
          ))}
        </View>
        <View style={styles.footerSection}>
          <Skeleton
            width="100%"
            height={normalize(50)}
            borderRadius={normalize(14)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setNewPassword('');
                setNewPasswordConfirm('');
                resetVerification();
                return;
              }
              navigation.goBack();
            }}
          >
            <Ionicons
              name="chevron-back"
              size={normalize(24)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 찾기</Text>
        </View>
        <Text style={styles.description}>
          {step === 1
            ? '이름·아이디·전화번호로 본인 확인 후 새 비밀번호를 설정합니다.'
            : '확인된 계정의 새 비밀번호를 입력해 주세요.'}
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.contentSection}>
          <SignupStepScroll normalize={normalize} bottomOffset={step === 2 ? 100 : 72}>
            {step === 1 ? (
              <>
                <Text style={styles.inputLabel}>이름</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="이름 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={handleIdentityFieldChange(setName)}
                  />
                </View>

                <Text style={styles.inputLabel}>아이디</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="아이디 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={username}
                    onChangeText={handleIdentityFieldChange(setUsername)}
                    autoCapitalize="none"
                  />
                </View>

                <RecoveryPhoneFields
                  styles={styles}
                  normalize={normalize}
                  name={name}
                  phoneNumber={phoneNumber}
                  onPhoneChange={setPhoneNumber}
                  isVerified={isPhoneVerified}
                  onVerified={handlePhoneVerified}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>이름</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.inputReadonly]}
                    value={verifiedUser?.name || ''}
                    editable={false}
                  />
                </View>

                <Text style={styles.inputLabel}>아이디</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.inputReadonly]}
                    value={verifiedUser?.username || ''}
                    editable={false}
                  />
                </View>

                <Text style={styles.inputLabel}>새 비밀번호</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="영문+숫자 8자 이상"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.inputLabel}>새 비밀번호 확인</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="새 비밀번호 다시 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={newPasswordConfirm}
                    onChangeText={setNewPasswordConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}
          </SignupStepScroll>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.footerSection}>
        {step === 1 ? (
          <Text style={styles.helperText}>
            {checkingUser
              ? '본인 확인 중...'
              : isPhoneVerified
                ? '본인 확인이 완료되었습니다. 다음 단계로 이동합니다.'
                : '전화번호 인증을 완료하면 다음 단계로 이동합니다.'}
          </Text>
        ) : null}
        {step === 2 ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canResetPassword || resetting) && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.9}
            disabled={!canResetPassword || resetting}
            onPress={handleResetPassword}
          >
            <Text style={styles.primaryButtonText}>
              {resetting ? '변경 중...' : '비밀번호 변경'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default PWfind;
