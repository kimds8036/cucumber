import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes } from '../../../styles/colors';
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
import SchoolSearchField from './SchoolSearchField';
import SignupHelperText from './SignupHelperText';

/** TODO(debug): SignStep2 레이아웃 확인용 — 제거 요청 시 이 상수·dbg·적용부만 삭제 */
const DEBUG_LAYOUT = true;
const dbg = (color) =>
  DEBUG_LAYOUT ? { borderWidth: 1, borderColor: color } : null;

const SignStep2 = ({
  styles,
  normalize,
  verifiedName,
  verifiedBirthDate,
  verifiedPhone,
  bottomOffset,
  accountOnly = false,
  showSchoolField = false,
  selectedSchool,
  onSchoolSelect,
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
    debugColor = '#e67e22',
  }) => (
    <View style={dbg(debugColor)}>
      <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>{label}</Text>
      <View style={[styles.inputWrapper, wrapperStyle]}>
        <View style={[styles.input, styles.passwordInputFrame, inputStyle]}>
          <TextInput
            style={styles.passwordInput}
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
              size={normalize(fontSizes.title + 4)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFieldFeedback = (status, { validText, invalidText, hintText, debugColor = '#27ae60' }) => {
    if (status === 'idle') {
      return hintText ? (
        <SignupHelperText normalize={normalize} tight style={dbg(debugColor)}>
          {hintText}
        </SignupHelperText>
      ) : null;
    }
    const isOk = status === 'valid' || status === 'match';
    return (
      <SignupHelperText
        normalize={normalize}
        variant={isOk ? 'success' : 'error'}
        tight
        style={dbg(debugColor)}
      >
        {isOk ? validText : invalidText}
      </SignupHelperText>
    );
  };

  return (
    <View style={[styles.stepFlex, dbg('#e74c3c')]}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        {accountOnly ? (
          verifiedName ? (
            <>
              <View style={dbg('#3498db')}>
                <SignupLockedField
                  label="이름"
                  value={verifiedName}
                  styles={styles}
                  compactBottom
                />
              </View>
              <SignupHelperText
                normalize={normalize}
                variant="emphasis"
                tight
                style={dbg('#9b59b6')}
              >
                본인인증으로 확인된 이름이며 변경할 수 없습니다.
              </SignupHelperText>
            </>
          ) : null
        ) : (
          <>
            <View style={dbg('#3498db')}>
              <SignupLockedField
                label="이름"
                value={verifiedName}
                placeholder="본인 확인 후 자동 입력"
                styles={styles}
              />
            </View>
            <View style={dbg('#2980b9')}>
              <SignupLockedField
                label="생년월일"
                value={verifiedBirthDate}
                placeholder="본인 확인 후 자동 입력"
                styles={styles}
              />
            </View>
            {verifiedPhone ? (
              <View style={dbg('#1abc9c')}>
                <SignupLockedField
                  label="전화번호"
                  value={verifiedPhone}
                  styles={styles}
                />
              </View>
            ) : null}
          </>
        )}

        <View style={dbg('#f1c40f')}>
          <Text
            style={[
              styles.inputLabel,
              (verifiedName || !accountOnly) && styles.inputLabelSpaced,
            ]}
          >
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
        </View>
        {renderFieldFeedback(usernameStatus, {
          validText: '사용 가능한 아이디 형식입니다.',
          invalidText: USERNAME_ERROR,
          debugColor: '#27ae60',
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
          debugColor: '#e67e22',
        })}
        {renderFieldFeedback(passwordStatus, {
          validText: '사용 가능한 비밀번호 형식입니다.',
          invalidText: PASSWORD_ERROR,
          debugColor: '#16a085',
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
              ? styles.passwordConfirmMatch
              : passwordConfirmStatus === 'mismatch'
                ? styles.passwordConfirmMismatch
                : undefined,
          debugColor: '#d35400',
        })}
        {renderFieldFeedback(passwordConfirmStatus, {
          validText: '비밀번호가 일치합니다.',
          invalidText: '비밀번호가 일치하지 않습니다.',
          debugColor: '#2ecc71',
        })}

        {showSchoolField ? (
          <>
            <View style={dbg('#8e44ad')}>
              <SchoolSearchField
                styles={styles}
                normalize={normalize}
                selectedSchool={selectedSchool}
                onSelect={onSchoolSelect}
              />
            </View>
            <SignupHelperText normalize={normalize} style={dbg('#c0392b')}>
              입력하신 학교는 이후 학생증 인증 단계에서 재학 여부를 확인하는 데
              사용됩니다.
            </SignupHelperText>
          </>
        ) : null}

        {showCertificateFields ? (
          <View style={dbg('#7f8c8d')}>
            <Text style={[styles.inputLabel, styles.certificateSubmitLabelSpaced]}>
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
          </View>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

export default SignStep2;
