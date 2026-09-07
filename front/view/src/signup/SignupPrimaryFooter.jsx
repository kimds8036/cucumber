import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';

/**
 * 회원가입 공통 하단 액션 푸터
 * 디자인 기준: createSignupStyles primaryButton / primaryButtonText
 * 좌우: 화면 기준 width * 0.07
 * 위아래: 버튼 위·아래 각 normalize(8)
 *   - hint가 있으면 paddingTop=0 + hint↔버튼 간격 8 (합산 여백 8 유지)
 * SafeArea bottom inset은 넣지 않음 (화면/셸 SafeArea 담당)
 *
 * @param {boolean} cancelParentPadding
 *   signup container(paddingHorizontal: width*0.04) 안에 있을 때 true
 * @param {boolean} embedded
 *   이미 width*0.07 패딩된 본문 안에 있을 때 true (이중 패딩 방지)
 */
const SignupPrimaryFooter = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  onLayout,
  hint = null,
  cancelParentPadding = false,
  embedded = false,
  style,
  buttonStyle,
  contentStyle,
  testID,
}) => {
  const { width } = useWindowDimensions();
  const hasHint = Boolean(hint);
  const styles = useMemo(
    () =>
      createStyles(getNormalize(width), width, {
        cancelParentPadding,
        embedded,
        hasHint,
      }),
    [width, cancelParentPadding, embedded, hasHint],
  );
  const isDisabled = disabled || loading;

  return (
    <View style={[styles.footer, style]} onLayout={onLayout} testID={testID}>
      <View style={[styles.content, contentStyle]}>
        {hasHint ? <Text style={styles.hint}>{hint}</Text> : null}
        <TouchableOpacity
          style={[
            styles.button,
            isDisabled && styles.buttonDisabled,
            buttonStyle,
          ]}
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text
              style={[styles.buttonText, isDisabled && styles.buttonTextDisabled]}
            >
              {label}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

function createStyles(
  normalize,
  width,
  { cancelParentPadding, embedded, hasHint },
) {
  const screenGutter = width * 0.07;
  const parentInset = width * 0.04;
  const edge = normalize(8);

  return StyleSheet.create({
    footer: {
      // hint 있을 때 paddingTop=0 + hint↔버튼 8 → 버튼 위 여백 합 8 유지
      paddingTop: hasHint ? 0 : edge,
      paddingBottom: edge,
      paddingHorizontal: embedded ? 0 : screenGutter,
      ...(cancelParentPadding && !embedded
        ? { marginHorizontal: -parentInset }
        : null),
      backgroundColor: colors.background,
      zIndex: 10,
      flexShrink: 0,
    },
    content: {
      width: '100%',
    },
    hint: {
      marginBottom: edge,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    button: {
      width: '100%',
      height: normalize(52),
      borderRadius: normalize(26),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      backgroundColor: colors.disabled,
    },
    buttonText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textWhite,
    },
    buttonTextDisabled: {
      color: colors.textSecondary,
    },
  });
}

export default SignupPrimaryFooter;
