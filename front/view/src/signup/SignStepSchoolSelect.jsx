import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SchoolSearchField from './SchoolSearchField';
import SignupStepScroll from './SignupStepScroll';
import AuthTextField from './AuthTextField';

/** 계정 만들기 ↔ 학생인증 사이 — 재학 학교·학년·반 */
const SignStepSchoolSelect = ({
  styles,
  normalize,
  selectedSchool,
  onSelect,
  gradeNum,
  onGradeNumChange,
  classNum,
  onClassNumChange,
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

  const handleSchoolClear = useCallback(() => {
    setSearchActive(false);
  }, []);

  const activateSearch = useCallback(() => {
    setSearchActive(true);
  }, []);

  const gradeClassFields = selectedSchool ? (
    <View style={localStyles.gradeClassRow}>
      <View style={localStyles.gradeClassCol}>
        <AuthTextField
          label="학년"
          compact
          value={gradeNum}
          placeholder="1"
          onChangeText={(text) => {
            onGradeNumChange?.(text.replace(/\D/g, '').slice(0, 1));
          }}
          keyboardType="number-pad"
          maxLength={1}
          returnKeyType="next"
        />
      </View>
      <View style={localStyles.gradeClassCol}>
        <AuthTextField
          label="반"
          compact
          value={classNum}
          placeholder="1"
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
        onClear={handleSchoolClear}
      />
      {selectedSchool && !searchActive ? gradeClassFields : null}
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

  return (
    <View style={[styles.stepFlex, localStyles.body]}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        {content}
      </SignupStepScroll>
    </View>
  );
};

function createLocalStyles(normalize, width) {
  return StyleSheet.create({
    body: {
      flex: 1,
      marginHorizontal: -width * 0.04,
      paddingHorizontal: width * 0.07,
    },
    fieldLabel: {
      marginBottom: normalize(6),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      letterSpacing: 0.2,
      color: colors.textLight4,
    },
    gradeClassRow: {
      flexDirection: 'row',
      gap: normalize(20),
      marginTop: normalize(28),
    },
    gradeClassCol: {
      flex: 1,
      minWidth: 0,
    },
  });
}

export default SignStepSchoolSelect;
