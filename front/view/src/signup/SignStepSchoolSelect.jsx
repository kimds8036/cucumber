import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SchoolSearchField from './SchoolSearchField';
import SignupStepScroll from './SignupStepScroll';

/** 계정 만들기 ↔ 학생증 인증 사이 — 재학 학교·학년·반 */
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
        <Text style={localStyles.fieldLabel}>학년</Text>
        <View
          style={[
            localStyles.underlineField,
            gradeNum ? localStyles.underlineFieldActive : null,
          ]}
        >
          <TextInput
            style={localStyles.fieldInput}
            placeholder=""
            placeholderTextColor={colors.textSecondary}
            value={gradeNum}
            onChangeText={(text) => {
              onGradeNumChange?.(text.replace(/\D/g, '').slice(0, 1));
            }}
            keyboardType="number-pad"
            maxLength={1}
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={localStyles.gradeClassCol}>
        <Text style={localStyles.fieldLabel}>반</Text>
        <View
          style={[
            localStyles.underlineField,
            classNum ? localStyles.underlineFieldActive : null,
          ]}
        >
          <TextInput
            style={localStyles.fieldInput}
            placeholder=""
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
    gradeClassRow: {
      flexDirection: 'row',
      gap: normalize(24),
      marginTop: normalize(24),
    },
    gradeClassCol: {
      flex: 1,
      minWidth: 0,
    },
    underlineField: {
      paddingBottom: normalize(8),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight20,
    },
    underlineFieldActive: {
      borderBottomColor: colors.textPrimary,
    },
    fieldInput: {
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xxl),
      minHeight: normalize(fontSizes.xxl),
      color: colors.textPrimary,
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: 'center' },
        ios: {},
      }),
    },
  });
}

export default SignStepSchoolSelect;
