import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../constants/colors';

interface HeaderProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
        {leftIcon}
      </TouchableOpacity>
      <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
        {rightIcon}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.black,
  },
  iconButton: {
    padding: 8,
  },
});