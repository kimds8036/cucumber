import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import {
  USERNAME_HINT,
  PASSWORD_HINT,
  USERNAME_ERROR,
  PASSWORD_ERROR,
  isValidUsername,
  isValidPassword,
} from '../../../utils/signupValidation';
import SignupLockedField from './SignupLockedField';
import SignupStepScroll from './SignupStepScroll';

const SignStep2 = ({
  styles,
  normalize,
  verifiedName,
  verifiedBirthDate,
  verifiedPhone,
  bottomOffset,
  accountOnly = false,
  showCertificateFields = false,
  onChange,
  onCertificateChange,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [claimedSchoolName, setClaimedSchoolName] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [submissionNumber, setSubmissionNumber] = useState('');

  const notifyChange = (override = {}) => {
    onChange?.({
      username,
      password,
      passwordConfirm,
      ...override,
    });
  };

  const notifyCertificate = (override = {}) => {
    onCertificateChange?.({
      claimedSchoolName,
      certificateUrl,
      submissionNumber,
      ...override,
    });
  };

  const handleUsernameChange = (text) => {
    const normalized = text.replace(/\s/g, '_');
    setUsername(normalized);
    notifyChange({ username: normalized });
  };

  useEffect(() => {
    notifyChange();
  }, [username, password, passwordConfirm]);

  useEffect(() => {
    if (showCertificateFields) notifyCertificate();
  }, [claimedSchoolName, certificateUrl, submissionNumber, showCertificateFields]);

  const usernameStatus = useMemo(() => {
    if (!username) return 'idle';
    return isValidUsername(username) ? 'valid' : 'invalid';
  }, [username]);

  const passwordStatus = useMemo(() => {
    if (!password) return 'idle';
    return isValidPassword(password) ? 'valid' : 'invalid';
  }, [password]);

  const passwordConfirmStatus = useMemo(() => {
    if (!passwordConfirm) return 'idle';
    return password === passwordConfirm ? 'match' : 'mismatch';
  }, [password, passwordConfirm]);

  const renderPasswordField = ({
    label,
    value,
    onChangeText,
    visible,
    onToggleVisible,
    wrapperStyle,
    inputStyle,
    placeholder = PASSWORD_HINT,
  }) => (
    <>
      <Text style={[styles.inputLabel, localStyles.spacedLabel]}>{label}</Text>
      <View style={[styles.inputWrapper, wrapperStyle]}>
        <View style={[styles.input, localStyles.passwordInputFrame, inputStyle]}>
          <TextInput
            style={[
              localStyles.passwordInput,
              {
                fontSize: normalize(fontSizes.xxl),
                fontFamily: fonts.regular,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={onToggleVisible}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderFieldFeedback = (status, { validText, invalidText, hintText }) => {
    if (status === 'idle') {
      return hintText ? (
        <Text style={styles.fieldHelperText}>{hintText}</Text>
      ) : null;
    }
    const isOk = status === 'valid' || status === 'match';
    return (
      <Text
        style={[
          styles.fieldHelperText,
          isOk ? styles.fieldHelperTextSuccess : styles.fieldHelperTextError,
        ]}
      >
        {isOk ? validText : invalidText}
      </Text>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        {!accountOnly ? (
          <>
            <SignupLockedField
              label="이름"
              value={verifiedName}
              placeholder="본인 확인 후 자동 입력"
              styles={styles}
            />
            <SignupLockedField
              label="생년월일"
              value={verifiedBirthDate}
              placeholder="본인 확인 후 자동 입력"
              styles={styles}
            />
            {verifiedPhone ? (
              <SignupLockedField
                label="전화번호"
                value={verifiedPhone}
                styles={styles}
              />
            ) : null}
          </>
        ) : null}

        <Text style={[styles.inputLabel, !accountOnly && { marginTop: 8 }]}>
          아이디
        </Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder={USERNAME_HINT}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {renderFieldFeedback(usernameStatus, {
          validText: '사용 가능한 아이디 형식입니다.',
          invalidText: USERNAME_ERROR,
        })}

        {renderPasswordField({
          label: '비밀번호',
          value: password,
          onChangeText: (text) => {
            setPassword(text);
            notifyChange({ password: text });
          },
          visible: showPassword,
          onToggleVisible: () => setShowPassword((v) => !v),
        })}
        {renderFieldFeedback(passwordStatus, {
          validText: '사용 가능한 비밀번호 형식입니다.',
          invalidText: PASSWORD_ERROR,
        })}

        {renderPasswordField({
          label: '비밀번호 확인',
          value: passwordConfirm,
          onChangeText: (text) => {
            setPasswordConfirm(text);
            notifyChange({ passwordConfirm: text });
          },
          visible: showPasswordConfirm,
          onToggleVisible: () => setShowPasswordConfirm((v) => !v),
          placeholder: '',
          inputStyle:
            passwordConfirmStatus === 'match'
              ? { borderColor: colors.primaryDark, borderWidth: 1.5 }
              : passwordConfirmStatus === 'mismatch'
                ? { borderColor: colors.alert, borderWidth: 1.5 }
                : undefined,
        })}
        {renderFieldFeedback(passwordConfirmStatus, {
          validText: '비밀번호가 일치합니다.',
          invalidText: '비밀번호가 일치하지 않습니다.',
        })}

        {showCertificateFields ? (
          <>
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>
              재학 학교명
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="증명서에 기재된 학교명"
                placeholderTextColor={colors.textSecondary}
                value={claimedSchoolName}
                onChangeText={(text) => {
                  setClaimedSchoolName(text);
                  notifyCertificate({ claimedSchoolName: text });
                }}
              />
            </View>
            <Text style={styles.inputLabel}>열람용 주소</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="열람용 주소"
                placeholderTextColor={colors.textSecondary}
                value={certificateUrl}
                onChangeText={(text) => {
                  setCertificateUrl(text);
                  notifyCertificate({ certificateUrl: text });
                }}
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.inputLabel}>열람 번호</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="열람 번호"
                placeholderTextColor={colors.textSecondary}
                value={submissionNumber}
                onChangeText={(text) => {
                  setSubmissionNumber(text);
                  notifyCertificate({ submissionNumber: text });
                }}
                autoCapitalize="none"
              />
            </View>
          </>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

const localStyles = StyleSheet.create({
  spacedLabel: {
    marginTop: 12,
  },
  passwordInputFrame: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    color: colors.textPrimary,
  },
});

export default SignStep2;
