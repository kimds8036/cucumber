import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import colors from '../constants/colors';

interface CustomInputProps extends TextInputProps {
  placeholder: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({ placeholder, ...props }) => (
  <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor={colors.textSecondary}
    autoCapitalize="none"
    {...props}
  />
);

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 1,
  },
});