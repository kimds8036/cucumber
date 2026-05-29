import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../../styles/colors';
import SignupLockedField from './SignupLockedField';
import SignupStepScroll from './SignupStepScroll';

const SignStepNumber = ({
  styles,
  normalize,
  bottomOffset,
  lockedIdentity,
  onChange,
}) => {
  const [certificateUrl, setCertificateUrl] = useState('');
  const [submissionNumber, setSubmissionNumber] = useState('');
  const [claimedSchoolName, setClaimedSchoolName] = useState('');

  const notifyChange = (override = {}) => {
    onChange?.({
      certificateUrl,
      submissionNumber,
      claimedSchoolName,
      ...override,
    });
  };

  useEffect(() => {
    notifyChange();
  }, [certificateUrl, submissionNumber, claimedSchoolName]);

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        {lockedIdentity ? (
          <>
            <SignupLockedField
              label="이름"
              value={lockedIdentity.name}
              styles={styles}
            />
            <SignupLockedField
              label="생년월일"
              value={lockedIdentity.birthDate}
              styles={styles}
            />
            <SignupLockedField
              label="전화번호"
              value={lockedIdentity.phoneNumber}
              styles={styles}
            />
          </>
        ) : null}

        <Text style={styles.inputLabel}>재학 학교명</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="증명서에 기재된 학교명"
            placeholderTextColor={colors.textSecondary}
            value={claimedSchoolName}
            onChangeText={(text) => {
              setClaimedSchoolName(text);
              notifyChange({ claimedSchoolName: text });
            }}
          />
        </View>

        <Text style={styles.inputLabel}>열람용 주소</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="열람용 주소를 작성해 주세요"
            placeholderTextColor={colors.textSecondary}
            value={certificateUrl}
            onChangeText={(text) => {
              setCertificateUrl(text);
              notifyChange({ certificateUrl: text });
            }}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.inputLabel}>열람 번호</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="열람 번호를 입력해 주세요"
            placeholderTextColor={colors.textSecondary}
            value={submissionNumber}
            onChangeText={(text) => {
              setSubmissionNumber(text);
              notifyChange({ submissionNumber: text });
            }}
            autoCapitalize="none"
          />
        </View>
      </SignupStepScroll>
    </View>
  );
};

export default SignStepNumber;
