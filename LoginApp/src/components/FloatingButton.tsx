import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

interface FloatingButtonProps {
  onPress?: () => void;
  icon?: React.ReactNode;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ onPress, icon }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {icon || <div style={styles.iconPlaceholder} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
});