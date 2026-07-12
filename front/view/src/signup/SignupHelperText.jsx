import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const PRIMARY_HELPER = {
  backgroundColor: colors.primaryLight10,
  textColor: colors.primaryDark,
  iconColor: colors.primaryDark,
};

const VARIANT_CONFIG = {
  default: {
    backgroundColor: colors.surface,
    textColor: colors.textLight70,
    iconName: 'information-circle-outline',
    iconColor: colors.textLight40,
  },
  success: {
    ...PRIMARY_HELPER,
    iconName: 'checkmark-circle-outline',
  },
  emphasis: {
    ...PRIMARY_HELPER,
    iconName: 'shield-checkmark-outline',
  },
  /** 라벨·입력 사이 안내 — 배경/아이콘/여백 없음 */
  plain: {
    backgroundColor: colors.transparent,
    textColor: colors.textSecondary,
    showIcon: false,
    flush: true,
  },
  error: {
    backgroundColor: colors.alertLight,
    textColor: colors.alertDark,
    iconName: 'alert-circle-outline',
    iconColor: colors.alertDark,
  },
};

/** 회원가입 — 입력·버튼 아래 안내 문구 (입력 필드와 동일 98% 너비 정렬) */
const SignupHelperText = ({
  children,
  variant = 'default',
  normalize = (n) => n,
  style,
  textStyle,
  tight = false,
  showIcon = true,
  centered = false,
}) => {
  const cfg = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.default;
  const shouldShowIcon =
    cfg.showIcon !== false && showIcon && !centered && Boolean(cfg.iconName);
  const flush = Boolean(cfg.flush);

  return (
    <View
      style={[
        styles.wrap,
        flush && styles.wrapFlush,
        centered && styles.wrapCentered,
        {
          backgroundColor: cfg.backgroundColor,
          marginTop: flush ? 0 : normalize(tight ? 6 : 6),
          marginBottom: flush ? normalize(8) : normalize(tight ? 6 : 10),
          marginLeft: flush ? normalize(20) : undefined,
          marginRight: flush ? 0 : undefined,
          paddingHorizontal: flush ? 0 : normalize(14),
          paddingVertical: flush ? 0 : normalize(tight ? 8 : 10),
          borderRadius: flush ? 0 : normalize(20),
          ...(cfg.borderColor
            ? {
                borderWidth: 1,
                borderColor: cfg.borderColor,
              }
            : null),
        },
        style,
      ]}
    >
      {shouldShowIcon ? (
        <Ionicons
          name={cfg.iconName}
          size={normalize(17)}
          color={cfg.iconColor}
          style={[styles.icon, { marginTop: normalize(1) }]}
        />
      ) : null}
      <Text
        style={[
          styles.text,
          {
            fontSize: normalize(fontSizes.lg),
            lineHeight: normalize(20),
            color: cfg.textColor,
            textAlign: centered ? 'center' : 'left',
          },
          centered && styles.textCentered,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '98%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wrapFlush: {
    width: '100%',
    alignSelf: 'stretch',
  },
  wrapCentered: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  icon: {
    flexShrink: 0,
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontFamily: fonts.regular,
  },
  textCentered: {
    flex: 0,
  },
});

export default SignupHelperText;
