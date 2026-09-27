import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, fontSizes } from '../../../styles/colors';

/**
 * 로그인·가입·찾기 공통 입력.
 * 라벨 + 라운드 박스 + 좌 아이콘. 비밀번호면 눈 토글.
 */
const AuthTextField = ({
  label,
  labelExtra,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  success,
  secureTextEntry = false,
  editable = true,
  compact = false,
  rightAddon,
  onFocus,
  onBlur,
  autoCapitalize = 'none',
  style,
  ...rest
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(
    () => (size) => Math.round((width / 375) * size),
    [width],
  );
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isSecure = Boolean(secureTextEntry);
  const hasError = Boolean(error);
  const isReadonly = editable === false;

  return (
    <View style={style}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {labelExtra ? (
            <Text style={styles.labelExtra}> {labelExtra}</Text>
          ) : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          compact && styles.boxCompact,
          focused && !hasError && !isReadonly && styles.boxFocused,
          hasError && styles.boxError,
          isReadonly && styles.boxReadonly,
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={normalize(compact ? 15 : 18)}
            color={
              hasError
                ? colors.alertDark
                : focused
                  ? colors.primaryDark
                  : colors.textLight40
            }
            style={styles.icon}
          />
        ) : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isSecure && hidden}
          autoCapitalize={autoCapitalize}
          editable={!isReadonly}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isSecure && !isReadonly ? (
          <TouchableOpacity
            onPress={() => setHidden((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={hidden ? '비밀번호 보기' : '비밀번호 숨기기'}
          >
            <Feather
              name={hidden ? 'eye-off' : 'eye'}
              size={normalize(18)}
              color={colors.textLight40}
            />
          </TouchableOpacity>
        ) : null}
        {rightAddon}
      </View>
      {hasError ? <Text style={styles.error}>{error}</Text> : null}
      {!hasError && success ? (
        <Text style={styles.success}>{success}</Text>
      ) : null}
    </View>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    label: {
      marginBottom: normalize(6),
      marginLeft: normalize(2),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    labelExtra: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textLight40,
    },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: normalize(52),
      borderRadius: normalize(16),
      borderWidth: 1.5,
      borderColor: colors.textLight20,
      backgroundColor: colors.surface,
      paddingHorizontal: normalize(14),
    },
    boxCompact: {
      minHeight: normalize(48),
      paddingHorizontal: normalize(10),
    },
    boxFocused: {
      borderColor: colors.primaryDark,
      backgroundColor: colors.background,
    },
    boxError: {
      borderColor: colors.alertDark,
      backgroundColor: colors.alertLight,
    },
    boxReadonly: {
      backgroundColor: colors.surface,
    },
    icon: {
      marginRight: normalize(10),
    },
    input: {
      flex: 1,
      minHeight: normalize(44),
      paddingVertical: normalize(8),
      paddingHorizontal: 0,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false },
        ios: {},
      }),
    },
    error: {
      marginTop: normalize(6),
      marginLeft: normalize(4),
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.alertDark,
      lineHeight: normalize(16),
    },
    success: {
      marginTop: normalize(6),
      marginLeft: normalize(4),
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
      lineHeight: normalize(16),
    },
  });
}

export default AuthTextField;
