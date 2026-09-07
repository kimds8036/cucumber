import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupStepScroll from './SignupStepScroll';

const SignStepCertificate = ({
  styles,
  normalize,
  bottomOffset,
  onChange,
  insetBody = true,
}) => {
  const { width } = useWindowDimensions();
  const [certificateUrl, setCertificateUrl] = useState('');
  const [accessNumber, setAccessNumber] = useState('');
  const localStyles = useMemo(
    () => createLocalStyles(normalize),
    [normalize],
  );
  const bodyStyle = useMemo(
    () => ({
      ...(insetBody
        ? {
            marginHorizontal: -width * 0.04,
            paddingHorizontal: width * 0.07,
          }
        : {}),
    }),
    [width, insetBody],
  );

  const notifyChange = (override = {}) => {
    onChange?.({
      certificateUrl,
      accessNumber,
      ...override,
    });
  };

  useEffect(() => {
    notifyChange();
  }, [certificateUrl, accessNumber]);

  const accessNumberError =
    accessNumber.length > 0 && accessNumber.length !== 6;

  return (
    <View style={[styles.certificateSubmitContainer, bodyStyle]}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        <Text style={localStyles.fieldLabel}>열람용 주소</Text>
        <View
          style={[
            localStyles.underlineField,
            certificateUrl ? localStyles.underlineFieldActive : null,
          ]}
        >
          <TextInput
            style={localStyles.fieldInput}
            value={certificateUrl}
            onChangeText={(text) => {
              setCertificateUrl(text);
              notifyChange({ certificateUrl: text });
            }}
            placeholder="https://naver.me/XXXXXXXX"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="url"
            textContentType="URL"
            autoComplete="url"
          />
        </View>

        <Text style={[localStyles.fieldLabel, localStyles.fieldLabelSpaced]}>
          열람 번호
        </Text>
        <View
          style={[
            localStyles.underlineField,
            accessNumberError
              ? localStyles.underlineFieldError
              : accessNumber
                ? localStyles.underlineFieldActive
                : null,
          ]}
        >
          <TextInput
            style={localStyles.fieldInput}
            value={accessNumber}
            onChangeText={(text) => {
              const next = text.replace(/\D/g, '').slice(0, 6);
              setAccessNumber(next);
              notifyChange({ accessNumber: next });
            }}
            placeholder="6자리 번호 입력"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
        <View style={localStyles.fieldFeedbackSlot}>
          {accessNumberError ? (
            <Text style={localStyles.fieldFeedbackError}>
              6자리 번호를 입력해 주세요
            </Text>
          ) : null}
        </View>
      </SignupStepScroll>
    </View>
  );
};

function createLocalStyles(normalize) {
  return StyleSheet.create({
    fieldLabel: {
      marginBottom: normalize(10),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(Math.round(fontSizes.lg * 1.45)),
      color: colors.textSecondary,
    },
    fieldLabelSpaced: {
      marginTop: normalize(24),
    },
    underlineField: {
      paddingBottom: normalize(8),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight20,
    },
    underlineFieldActive: {
      borderBottomColor: colors.textPrimary,
    },
    underlineFieldError: {
      borderBottomColor: colors.alert,
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
    fieldFeedbackSlot: {
      marginTop: normalize(8),
      minHeight: normalize(Math.round(fontSizes.lg * 1.4)),
    },
    fieldFeedbackError: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(Math.round(fontSizes.lg * 1.4)),
      color: colors.alert,
    },
  });
}

export default SignStepCertificate;
