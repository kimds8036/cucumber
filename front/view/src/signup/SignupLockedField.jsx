import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../styles/colors';

/** 이전 단계에서 확정된 값 — 칸은 일반 입력과 동일, 텍스트만 회색 */
const SignupLockedField = ({
  label,
  value,
  placeholder = '',
  styles,
  compactBottom = false,
  helperBelowLabel = null,
}) => (
  <>
    <Text style={styles.inputLabel}>{label}</Text>
    {helperBelowLabel}
    <View
      style={[styles.inputWrapper, compactBottom && { marginBottom: 0 }]}
    >
      <View
        style={[
          styles.input,
          styles.lockedFieldInner,
          compactBottom && { marginBottom: 0 },
        ]}
      >
        <Text
          style={[styles.lockedFieldText, !value && styles.lockedFieldPlaceholder]}
          numberOfLines={2}
        >
          {value || placeholder}
        </Text>
      </View>
    </View>
  </>
);

export default SignupLockedField;
