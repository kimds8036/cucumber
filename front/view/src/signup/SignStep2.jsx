import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
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
import SignupHelperText from './SignupHelperText';

const USERNAME_VALID_MESSAGE = '사용 가능한 아이디입니다';
const PASSWORD_INVALID_MESSAGE = '잘못된 비밀번호입니다';
const PASSWORD_CONFIRM_MISMATCH_MESSAGE = '비밀번호가 일치하지 않습니다';
const PLACEHOLDER_TEXT_COLOR = colors.textSecondary;

function resolveUnderlineStatus(status) {
  if (status === 'valid' || status === 'match') return 'success';
  if (status === 'invalid' || status === 'mismatch') return 'error';
  return 'idle';
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
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

  const renderAccountFieldFeedback = (status, { successText, errorText }) => {
    const isOk = status === 'valid' || status === 'match';
    const isError = status === 'invalid' || status === 'mismatch';
    const showMessage =
      status !== 'idle' && (isError || (isOk && Boolean(successText)));

    return (
      <View style={accountStyles.fieldFeedbackSlot}>
        {showMessage ? (
          <Text
            style={[
              accountStyles.fieldFeedback,
              isOk ? accountStyles.fieldFeedbackSuccess : accountStyles.fieldFeedbackError,
            ]}
          >
            {isOk ? successText : errorText}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderAccountUnderlineField = ({
    label,
    labelExtra,
    value,
    onChangeText,
    placeholder,
    placeholderTextColor = PLACEHOLDER_TEXT_COLOR,
    secureTextEntry = false,
    visible,
    onToggleVisible,
    underlineStatus = 'idle',
    feedback = null,
    autoCapitalize = 'none',
  }) => {
    const resolvedStatus = resolveUnderlineStatus(underlineStatus);

    return (
      <View style={accountStyles.fieldBlock}>
        {labelExtra ? (
          <Text style={accountStyles.fieldLabel}>
            {label}{' '}
            <Text style={accountStyles.fieldLabelExtra}>{labelExtra}</Text>
          </Text>
        ) : (
          <Text style={accountStyles.fieldLabel}>{label}</Text>
        )}
        <View
          style={[
            accountStyles.underlineField,
            resolvedStatus === 'success' && accountStyles.underlineFieldSuccess,
            resolvedStatus === 'error' && accountStyles.underlineFieldError,
          ]}
        >
          {onChangeText ? (
            <View style={accountStyles.inputRow}>
              <TextInput
                style={accountStyles.fieldInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                spellCheck={false}
                keyboardType={Platform.select({
                  ios: 'ascii-capable',
                  android: 'email-address',
                })}
                textContentType={secureTextEntry ? 'newPassword' : 'username'}
                autoComplete={secureTextEntry ? 'password-new' : 'username'}
                multiline={false}
                scrollEnabled={false}
              />
              {onToggleVisible ? (
                <TouchableOpacity
                  style={accountStyles.inputIconButton}
                  onPress={onToggleVisible}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  <Ionicons
                    name={visible ? 'eye-outline' : 'eye-off-outline'}
                    size={normalize(18)}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ) : (
                <View style={accountStyles.inputIconSlot} />
              )}
            </View>
          ) : (
            <Text style={accountStyles.lockedValue}>{value}</Text>
          )}
        </View>
        {feedback}
      </View>
    );
  };

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
            spellCheck={false}
            keyboardType={Platform.select({
              ios: 'ascii-capable',
              android: 'email-address',
            })}
            textContentType="newPassword"
            autoComplete="password-new"
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
    </>
  );

  const renderFieldFeedback = (status, { validText, invalidText, hintText }) => {
    if (status === 'idle') {
      return hintText ? (
        <SignupHelperText normalize={normalize} tight>
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
      >
        {isOk ? validText : invalidText}
      </SignupHelperText>
    );
  };

  if (accountOnly) {
    return (
      <Pressable
        style={[styles.stepFlex, accountStyles.body]}
        onPress={Keyboard.dismiss}
      >
        {renderAccountUnderlineField({
          label: '이름',
          labelExtra: '(본인인증으로 확인된 이름으로 변경할 수 없습니다)',
          value: verifiedName || '',
        })}
        {renderAccountUnderlineField({
          label: '아이디',
          value: username,
          onChangeText: handleUsernameChange,
          placeholder: USERNAME_HINT,
          placeholderTextColor: PLACEHOLDER_TEXT_COLOR,
          underlineStatus: usernameStatus,
          feedback: renderAccountFieldFeedback(usernameStatus, {
            successText: USERNAME_VALID_MESSAGE,
            errorText: USERNAME_ERROR,
          }),
        })}
        {renderAccountUnderlineField({
          label: '비밀번호',
          value: password,
          onChangeText: (text) => {
            setPassword(text);
            notifyChange({ password: text });
          },
          placeholder: PASSWORD_HINT,
          placeholderTextColor: PLACEHOLDER_TEXT_COLOR,
          secureTextEntry: !showPassword,
          visible: showPassword,
          onToggleVisible: () => setShowPassword((v) => !v),
          underlineStatus: passwordStatus,
          feedback: renderAccountFieldFeedback(passwordStatus, {
            successText: '',
            errorText: PASSWORD_INVALID_MESSAGE,
          }),
        })}
        {renderAccountUnderlineField({
          label: '비밀번호 확인',
          value: passwordConfirm,
          onChangeText: (text) => {
            setPasswordConfirm(text);
            notifyChange({ passwordConfirm: text });
          },
          placeholder: '',
          secureTextEntry: !showPasswordConfirm,
          visible: showPasswordConfirm,
          onToggleVisible: () => setShowPasswordConfirm((v) => !v),
          underlineStatus: passwordConfirmStatus,
          feedback: renderAccountFieldFeedback(passwordConfirmStatus, {
            successText: '',
            errorText: PASSWORD_CONFIRM_MISMATCH_MESSAGE,
          }),
        })}
      </Pressable>
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

        <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>아이디</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder={USERNAME_HINT}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType={Platform.select({
              ios: 'ascii-capable',
              android: 'email-address',
            })}
            textContentType="username"
            autoComplete="username"
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
              ? styles.passwordConfirmMatch
              : passwordConfirmStatus === 'mismatch'
                ? styles.passwordConfirmMismatch
                : undefined,
        })}
        {renderFieldFeedback(passwordConfirmStatus, {
          validText: '비밀번호가 일치합니다.',
          invalidText: '비밀번호가 일치하지 않습니다.',
        })}

        {showCertificateFields ? (
          <>
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
                autoCorrect={false}
                spellCheck={false}
                keyboardType="url"
                textContentType="URL"
                autoComplete="url"
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

function createAccountStyles(normalize, width) {
  const inputMinHeight = normalize(Math.round(fontSizes.xxl));
  const inputIconSize = normalize(18);

  return StyleSheet.create({
    body: {
      flex: 1,
      marginHorizontal: -width * 0.04,
      paddingHorizontal: width * 0.07,
      paddingTop: normalize(4),
    },
    fieldBlock: {
      marginBottom: normalize(24),
    },
    fieldLabel: {
      marginBottom: normalize(10),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
      lineHeight: normalize(Math.round(fontSizes.lg * 1.45)),
    },
    fieldLabelExtra: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    underlineField: {
      paddingBottom: normalize(8),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight20,
    },
    underlineFieldSuccess: {
      borderBottomColor: colors.primary,
    },
    underlineFieldError: {
      borderBottomColor: colors.alert,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      minWidth: 0,
      height: inputIconSize,
      minHeight: inputIconSize,
    },
    fieldInput: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xxl),
      minHeight: inputMinHeight,
      height: inputIconSize,
      maxHeight: inputIconSize,
      color: colors.textPrimary,
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: 'center' },
        ios: {},
      }),
    },
    inputIconButton: {
      width: inputIconSize,
      height: inputIconSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputIconSlot: {
      width: inputIconSize,
      height: inputIconSize,
    },
    lockedValue: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xxl),
      minHeight: inputMinHeight,
      color: colors.textPrimary,
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: 'center' },
        ios: {},
      }),
    },
    fieldFeedbackSlot: {
      marginTop: normalize(8),
      minHeight: normalize(Math.round(fontSizes.lg * 1.4)),
      justifyContent: 'flex-start',
    },
    fieldFeedback: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(Math.round(fontSizes.lg * 1.4)),
    },
    fieldFeedbackSuccess: {
      color: colors.primary,
    },
    fieldFeedbackError: {
      color: colors.alert,
    },
  });
}

export default SignStep2;
