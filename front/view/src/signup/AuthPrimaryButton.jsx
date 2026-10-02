import React, { useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';

const AuthPrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles((size) => Math.round((width / 375) * size)),
    [width],
  );
  const blocked = disabled && !loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.wrap, blocked && styles.wrapDisabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {blocked ? (
        <Text style={[styles.label, styles.labelDisabled]}>{label}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      height: normalize(52),
      borderRadius: normalize(26),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    wrapDisabled: {
      backgroundColor: colors.textLight1,
    },
    label: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.white,
    },
    labelDisabled: {
      color: colors.textLight4,
    },
  });
}

export default AuthPrimaryButton;
