import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../../../styles/colors';
import { radius, shadow } from '../../../styles/tokens';

const AuthCard = ({ children, style }) => {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

  return <View style={[styles.card, style]}>{children}</View>;
};

function createStyles(width) {
  const normalize = (size) => Math.round((width / 375) * size);

  return StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      paddingHorizontal: normalize(22),
      paddingTop: normalize(28),
      paddingBottom: normalize(24),
      ...shadow.md,
    },
  });
}

export default AuthCard;
