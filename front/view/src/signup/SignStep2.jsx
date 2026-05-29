import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../../styles/colors';
import SignupLockedField from './SignupLockedField';
import SignupStepScroll from './SignupStepScroll';

const SignStep2 = ({
  styles,
  normalize,
  verifiedName,
  verifiedBirthDate,
  verifiedPhone,
  bottomOffset,
  showCertificateFields = false,
  onCertificateChange,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
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

  useEffect(() => {
    notifyChange();
  }, [username, password, passwordConfirm]);

  useEffect(() => {
    if (showCertificateFields) notifyCertificate();
  }, [claimedSchoolName, certificateUrl, submissionNumber, showCertificateFields]);

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
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

        <Text style={[styles.inputLabel, { marginTop: 8 }]}>아이디</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              notifyChange({ username: text });
            }}
            placeholder="3~20자 영문·숫자·_"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.inputLabel}>비밀번호</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              notifyChange({ password: text });
            }}
            placeholder="8자 이상, 영문+숫자"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.inputLabel}>비밀번호 확인</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={(text) => {
              setPasswordConfirm(text);
              notifyChange({ passwordConfirm: text });
            }}
            placeholder="비밀번호 다시 입력"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

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

export default SignStep2;
