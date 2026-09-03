import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../../styles/colors';
import SchoolSearchField from './SchoolSearchField';
import SignupHelperText from './SignupHelperText';
import SignupStepScroll from './SignupStepScroll';

/** 계정 만들기 ↔ 학생증 인증 사이 — 재학 학교·학년·반 */
const SignStepSchoolSelect = ({
  styles,
  normalize,
  selectedSchool,
  onSelect,
  grade,
  onGradeChange,
  classNum,
  onClassNumChange,
  bottomOffset,
}) => {
  const schoolSearch = (
    <SchoolSearchField
      styles={styles}
      normalize={normalize}
      selectedSchool={selectedSchool}
      onSelect={onSelect}
      labelMarginTop={0}
      expandList={!selectedSchool}
      helperBelowLabel={
        <SignupHelperText normalize={normalize} variant="plain">
          학교는 학생증 정보 일치 여부 확인을 위해 사용됩니다.
        </SignupHelperText>
      }
    />
  );

  const gradeClassFields = selectedSchool ? (
    <View style={{ marginTop: normalize(16), paddingBottom: normalize(4) }}>
      <Text style={[styles.inputLabel, styles.inputLabelSpaced, { marginTop: 0 }]}>
        학년
      </Text>
      <SignupHelperText normalize={normalize} variant="plain" tight>
        생년월일 기준으로 자동 입력되며, 다르면 수정할 수 있어요
      </SignupHelperText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="학년 (1~3)"
          placeholderTextColor={colors.textSecondary}
          value={grade}
          onChangeText={(text) => {
            const next = text.replace(/\D/g, '').slice(0, 1);
            if (next === '' || (Number(next) >= 1 && Number(next) <= 3)) {
              onGradeChange?.(next);
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          returnKeyType="done"
        />
      </View>

      <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>반</Text>
      <SignupHelperText normalize={normalize} variant="plain" tight>
        학생증에 적힌 반을 숫자만 정확히 입력해 주세요
      </SignupHelperText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="반 (예: 1)"
          placeholderTextColor={colors.textSecondary}
          value={classNum}
          onChangeText={(text) => {
            onClassNumChange?.(text.replace(/\D/g, '').slice(0, 2));
          }}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="done"
        />
      </View>
    </View>
  ) : null;

  return (
    <View style={styles.stepFlex}>
      {selectedSchool ? (
        <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
          {schoolSearch}
          {gradeClassFields}
        </SignupStepScroll>
      ) : (
        schoolSearch
      )}
    </View>
  );
};

export default SignStepSchoolSelect;
