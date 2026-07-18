import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/colors';
import SchoolSearchField from './SchoolSearchField';
import SignupHelperText from './SignupHelperText';
import SignupLockedField from './SignupLockedField';

/** 계정 만들기 ↔ 학생증 인증 사이 — 재학 학교·학년(잠금)·반 */
const SignStepSchoolSelect = ({
  styles,
  normalize,
  selectedSchool,
  onSelect,
  gradeLabel,
  classNum,
  onClassNumChange,
  onPressGradeMismatch,
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

    <View style={{ marginTop: normalize(8), paddingBottom: normalize(4) }}>
      <SignupLockedField
        label="학년"
        value={gradeLabel}
        placeholder="생년월일 기준으로 자동 표시"
        styles={styles}
        compactBottom
      />
      <TouchableOpacity
        onPress={onPressGradeMismatch}
        activeOpacity={0.7}
        style={{
          alignSelf: 'flex-start',
          marginLeft: normalize(20),
          marginTop: normalize(6),
          marginBottom: normalize(10),
          paddingVertical: normalize(2),
        }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text
          style={{
            fontSize: normalize(13),
            color: colors.primary,
            fontWeight: '600',
            textDecorationLine: 'underline',
          }}
        >
          이 학년이 아니신가요?
        </Text>
      </TouchableOpacity>

      <Text style={styles.inputLabel}>반</Text>
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
      <SignupHelperText normalize={normalize} variant="plain" tight>
        반은 직접 입력해 주세요. 다음 단계에서 학교·학년·반을 한 번 더 확인합니다.
      </SignupHelperText>
    </View>
  </View>
);

export default SignStepSchoolSelect;
