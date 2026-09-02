import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SchoolSearchField from './SchoolSearchField';
import SignupLockedField from './SignupLockedField';
import SignupStepScroll from './SignupStepScroll';

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
  bottomOffset,
}) => {
  const { width } = useWindowDimensions();
  const [searchActive, setSearchActive] = useState(false);
  const localStyles = useMemo(
    () => createLocalStyles(normalize, width),
    [normalize, width],
  );
  const stepStyles = useMemo(
    () => ({
      ...styles,
      inputLabel: {
        ...styles.inputLabel,
        marginLeft: 0,
      },
    }),
    [styles],
  );

  const handleSelect = useCallback(
    (school) => {
      onSelect?.(school);
      if (school) setSearchActive(false);
    },
    [onSelect],
  );

  const activateSearch = useCallback(() => {
    setSearchActive(true);
  }, []);

  const gradeClassFields = selectedSchool ? (
    <View style={{ marginTop: normalize(8), paddingBottom: normalize(4) }}>
      <SignupLockedField
        label="학년"
        value={gradeLabel}
        placeholder="생년월일 기준으로 자동 표시"
        styles={stepStyles}
        compactBottom
      />
      <TouchableOpacity
        onPress={onPressGradeMismatch}
        activeOpacity={0.7}
        style={{
          alignSelf: 'flex-start',
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

      <Text style={stepStyles.inputLabel}>반</Text>
      <View style={[stepStyles.inputWrapper, localStyles.classInputWrapper]}>
        <TextInput
          style={[stepStyles.input, localStyles.classInput]}
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

  const content = (
    <>
      <Text style={localStyles.fieldLabel}>재학 중인 학교</Text>
      <SchoolSearchField
        styles={stepStyles}
        normalize={normalize}
        selectedSchool={selectedSchool}
        onSelect={handleSelect}
        hideLabel
        readOnly={!searchActive}
        onActivate={activateSearch}
        autoFocus={searchActive}
        inputVariant="underline"
        placeholder="검색하기"
        expandList={false}
        showListOnlyWithResults
        rowMarginHorizontal={0}
        showClearButton={Boolean(selectedSchool)}
      />
      {selectedSchool && !searchActive ? (
        <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
          {gradeClassFields}
        </SignupStepScroll>
      ) : null}
    </>
  );

  if (searchActive) {
    return (
      <Pressable
        style={[styles.stepFlex, localStyles.body]}
        onPress={Keyboard.dismiss}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.stepFlex, localStyles.body]}>{content}</View>;
};

function createLocalStyles(normalize, width) {
  return StyleSheet.create({
    body: {
      flex: 1,
      marginHorizontal: -width * 0.04,
      paddingHorizontal: width * 0.07,
    },
    fieldLabel: {
      marginBottom: normalize(10),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    classInputWrapper: {
      marginTop: normalize(4),
    },
    classInput: {
      marginBottom: 0,
    },
  });
}

export default SignStepSchoolSelect;
