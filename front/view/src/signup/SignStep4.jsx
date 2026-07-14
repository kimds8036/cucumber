import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../../styles/colors';
import { GRADE_ENROLLMENT_NOTICE } from './authFeatureAlerts';
import SignupLockedField from './SignupLockedField';
import SignupStepScroll from './SignupStepScroll';
import SignupHelperText from './SignupHelperText';

const resolveSchoolLabel = (recognizedData, schoolNameFallback) => {
  if (!recognizedData) return schoolNameFallback || '';
  if (typeof recognizedData.school === 'string') return recognizedData.school;
  if (recognizedData.school?.name) return recognizedData.school.name;
  return schoolNameFallback || '';
};

const SignStep4 = ({
  styles,
  normalize,
  recognizedData,
  schoolNameFallback,
  lockedName,
  bottomOffset,
  onChange,
}) => {
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');

  const displayName = lockedName || recognizedData?.name || '';
  const displaySchool = resolveSchoolLabel(recognizedData, schoolNameFallback);

  useEffect(() => {
    if (!recognizedData) return;
    const g = String(recognizedData.grade || '');
    const c = String(recognizedData.class || '');
    setGrade(g);
    setClassNum(c);
    onChange?.({
      name: displayName,
      school: displaySchool,
      grade: g,
      classNum: c,
      graduationYear: recognizedData.graduationYear,
    });
  }, [recognizedData]);

  const notifyChange = (override = {}) => {
    onChange?.({
      name: displayName,
      school: displaySchool,
      grade,
      classNum,
      graduationYear: recognizedData?.graduationYear,
      ...override,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        <SignupLockedField label="이름" value={displayName} styles={styles} />
        <SignupLockedField label="학교" value={displaySchool} styles={styles} />

        <Text style={styles.inputLabel}>학년</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="학년"
            placeholderTextColor={colors.textSecondary}
            value={grade}
            onChangeText={(text) => {
              setGrade(text.replace(/\D/g, '').slice(0, 1));
              notifyChange({ grade: text.replace(/\D/g, '').slice(0, 1) });
            }}
            keyboardType="number-pad"
          />
        </View>

        <Text style={styles.inputLabel}>반</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="반"
            placeholderTextColor={colors.textSecondary}
            value={classNum}
            onChangeText={(text) => {
              setClassNum(text.replace(/\D/g, '').slice(0, 2));
              notifyChange({ classNum: text.replace(/\D/g, '').slice(0, 2) });
            }}
            keyboardType="number-pad"
          />
        </View>

        <SignupHelperText normalize={normalize}>
          {GRADE_ENROLLMENT_NOTICE}
        </SignupHelperText>
      </SignupStepScroll>
    </View>
  );
};

export default SignStep4;
