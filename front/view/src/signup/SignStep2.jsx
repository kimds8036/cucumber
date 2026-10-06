import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
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
import AuthTextField from './AuthTextField';

const USERNAME_VALID_MESSAGE = '사용 가능한 아이디입니다';
const PASSWORD_INVALID_MESSAGE =
  '영문과 숫자를 포함해 8자 이상으로 입력해 주세요.';
const PASSWORD_CONFIRM_MISMATCH_MESSAGE = '비밀번호가 일치하지 않습니다';

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
  const { width } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [claimedSchoolName, setClaimedSchoolName] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [submissionNumber, setSubmissionNumber] = useState('');

  const accountStyles = useMemo(
    () => createAccountStyles(normalize, width),
    [normalize, width],
  );

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
  }, [
    claimedSchoolName,
    certificateUrl,
    submissionNumber,
    showCertificateFields,
  ]);

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

  const fieldGap = accountStyles.fieldGap;
  const asciiKeyboard = Platform.select({
    ios: 'ascii-capable',
    android: 'email-address',
  });

  if (accountOnly) {
    return (
      <View style={[styles.stepFlex, accountStyles.body]}>
        <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
          <AuthTextField
            label="이름"
            labelExtra="(본인인증으로 확인된 이름으로 변경할 수 없습니다)"
            icon="user"
            value={verifiedName || ''}
            editable={false}
            style={fieldGap}
          />
          <AuthTextField
            label="아이디"
            icon="at-sign"
            value={username}
            onChangeText={handleUsernameChange}
            placeholder={USERNAME_HINT}
            autoCorrect={false}
            spellCheck={false}
            keyboardType={asciiKeyboard}
            textContentType="username"
            autoComplete="username"
            error={usernameStatus === 'invalid' ? USERNAME_ERROR : ''}
            success={
              usernameStatus === 'valid' ? USERNAME_VALID_MESSAGE : ''
            }
            style={fieldGap}
          />
          <AuthTextField
            label="비밀번호"
            icon="lock"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              notifyChange({ password: text });
            }}
            placeholder={PASSWORD_HINT}
            secureTextEntry
            autoCorrect={false}
            spellCheck={false}
            keyboardType={asciiKeyboard}
            textContentType="newPassword"
            autoComplete="password-new"
            error={
              passwordStatus === 'invalid' ? PASSWORD_INVALID_MESSAGE : ''
            }
            style={fieldGap}
          />
          <AuthTextField
            label="비밀번호 확인"
            icon="lock"
            value={passwordConfirm}
            onChangeText={(text) => {
              setPasswordConfirm(text);
              notifyChange({ passwordConfirm: text });
            }}
            secureTextEntry
            autoCorrect={false}
            spellCheck={false}
            keyboardType={asciiKeyboard}
            textContentType="newPassword"
            autoComplete="password-new"
            error={
              passwordConfirmStatus === 'mismatch'
                ? PASSWORD_CONFIRM_MISMATCH_MESSAGE
                : ''
            }
            success={
              passwordConfirmStatus === 'match'
                ? '비밀번호가 일치합니다.'
                : ''
            }
          />
        </SignupStepScroll>
      </View>
    );
  }

  return (
    <View style={styles.stepFlex}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
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

        <AuthTextField
          label="아이디"
          icon="at-sign"
          value={username}
          onChangeText={handleUsernameChange}
          placeholder={USERNAME_HINT}
          autoCorrect={false}
          spellCheck={false}
          keyboardType={asciiKeyboard}
          textContentType="username"
          autoComplete="username"
          error={usernameStatus === 'invalid' ? USERNAME_ERROR : ''}
          success={
            usernameStatus === 'valid' ? '사용 가능한 아이디 형식입니다.' : ''
          }
          style={fieldGap}
        />
        <AuthTextField
          label="비밀번호"
          icon="lock"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            notifyChange({ password: text });
          }}
          placeholder={PASSWORD_HINT}
          secureTextEntry
          autoCorrect={false}
          spellCheck={false}
          keyboardType={asciiKeyboard}
          textContentType="newPassword"
          autoComplete="password-new"
          error={passwordStatus === 'invalid' ? PASSWORD_ERROR : ''}
          success={
            passwordStatus === 'valid'
              ? '사용 가능한 비밀번호 형식입니다.'
              : ''
          }
          style={fieldGap}
        />
        <AuthTextField
          label="비밀번호 확인"
          icon="lock"
          value={passwordConfirm}
          onChangeText={(text) => {
            setPasswordConfirm(text);
            notifyChange({ passwordConfirm: text });
          }}
          secureTextEntry
          autoCorrect={false}
          spellCheck={false}
          keyboardType={asciiKeyboard}
          textContentType="newPassword"
          autoComplete="password-new"
          error={
            passwordConfirmStatus === 'mismatch'
              ? '비밀번호가 일치하지 않습니다.'
              : ''
          }
          success={
            passwordConfirmStatus === 'match' ? '비밀번호가 일치합니다.' : ''
          }
          style={fieldGap}
        />

        {showCertificateFields ? (
          <>
            <AuthTextField
              label="재학 학교명"
              icon="home"
              placeholder="증명서에 기재된 학교명"
              value={claimedSchoolName}
              onChangeText={(text) => {
                setClaimedSchoolName(text);
                notifyCertificate({ claimedSchoolName: text });
              }}
              autoCapitalize="none"
              style={fieldGap}
            />
            <AuthTextField
              label="열람용 주소"
              icon="link"
              placeholder="열람용 주소"
              value={certificateUrl}
              onChangeText={(text) => {
                setCertificateUrl(text);
                notifyCertificate({ certificateUrl: text });
              }}
              autoCorrect={false}
              spellCheck={false}
              keyboardType="url"
              textContentType="URL"
              autoComplete="url"
              style={fieldGap}
            />
            <AuthTextField
              label="열람 번호"
              icon="hash"
              placeholder="열람 번호"
              value={submissionNumber}
              onChangeText={(text) => {
                setSubmissionNumber(text);
                notifyCertificate({ submissionNumber: text });
              }}
            />
          </>
        ) : null}
      </SignupStepScroll>
    </View>
  );
};

function createAccountStyles(normalize, width) {
  return StyleSheet.create({
    body: {
      flex: 1,
      paddingTop: normalize(4),
    },
    fieldGap: {
      marginBottom: normalize(14),
    },
  });
}

export default SignStep2;
