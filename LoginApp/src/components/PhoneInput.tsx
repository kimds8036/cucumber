import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { Button } from './Button';

interface PhoneInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  buttonText: string;
  onButtonPress: () => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  placeholder,
  value,
  onChangeText,
  buttonText,
  onButtonPress,
}) => (
  <View style={styles.container}>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={COLORS.placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType="phone-pad"
    />
    <View style={styles.buttonWrapper}>
      <Button title={buttonText} onPress={onButtonPress} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 14,
    color: COLORS.text,
  },
  buttonWrapper: {
    width: 80,
  },
});