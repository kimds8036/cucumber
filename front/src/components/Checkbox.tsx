import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onPress: () => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onPress }) => (
  <TouchableOpacity style={styles.container} onPress={onPress}>
    <View style={[styles.box, checked && styles.boxChecked]}>
      {checked && <View style={styles.inner} />}
    </View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 30 },
  box: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: 'transparent',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxChecked: { backgroundColor: colors.cardBackground },
  inner: { width: 10, height: 10, backgroundColor: colors.brand },
  label: { color: colors.brand, fontSize: 12, letterSpacing: 1 },
});