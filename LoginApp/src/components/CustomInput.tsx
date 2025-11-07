import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS } from '../constants/colors';

interface CustomInputProps extends TextInputProps {
  placeholder: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({ placeholder, ...props }) => (
  <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor={COLORS.placeholder}
    autoCapitalize="none"
    {...props}
  />
);

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    fontSize: 14,
    color: COLORS.text,
    letterSpacing: 1,
  },
});