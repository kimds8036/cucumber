import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

interface TagButtonProps {
  label: string;
  onPress?: () => void;
  isActive?: boolean;
}

export const TagButton: React.FC<TagButtonProps> = ({
  label,
  onPress,
  isActive = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.active]}
      onPress={onPress}
    >
      <Text style={[styles.text, isActive && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBackground,
  },
  active: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  activeText: {
    color: colors.background,
  },
});