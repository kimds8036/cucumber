import React, { useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      ) : (
        <LinearGradient
          colors={['#86C478', colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </LinearGradient>
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
    },
    wrapDisabled: {
      backgroundColor: colors.textLight1,
    },
    gradient: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
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
