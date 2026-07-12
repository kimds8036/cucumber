import React from 'react';
import { View } from 'react-native';
import SchoolSearchField from './SchoolSearchField';
import SignupHelperText from './SignupHelperText';

/** 계정 만들기 ↔ 학생증 인증 사이 — 재학 학교 검색·선택 */
const SignStepSchoolSelect = ({
  styles,
  normalize,
  selectedSchool,
  onSelect,
}) => (
  <View style={styles.stepFlex}>
    <SchoolSearchField
      styles={styles}
      normalize={normalize}
      selectedSchool={selectedSchool}
      onSelect={onSelect}
      labelMarginTop={0}
      expandList
      helperBelowLabel={
        <SignupHelperText normalize={normalize} variant="plain">
          학교는 학생증 정보 일치 여부 확인을 위해 사용됩니다.
        </SignupHelperText>
      }
    />
  </View>
);

export default SignStepSchoolSelect;
