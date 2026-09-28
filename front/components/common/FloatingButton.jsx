import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../../styles/colors';
import { getNormalize, FOOTER_HEIGHT } from '../../styles/frame.style';
import { shadow } from '../../styles/tokens';
import { useMainTabBarInset } from '../../context/MainTabBarInsetContext';

function createFloatingButtonStyles(normalize, aboveFooter, tabBarInset) {
  return StyleSheet.create({
    button: {
      position: 'absolute',
      right: normalize(20),
      bottom: normalize(20) + (aboveFooter ? normalize(35) : 0) + tabBarInset,
      width: normalize(50),
      height: normalize(50),
      borderRadius: normalize(28),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

export default function FloatingButton({ onPress, icon, aboveFooter = false }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const tabBarInset = useMainTabBarInset();
  const styles = useMemo(
    () => createFloatingButtonStyles(normalize, aboveFooter, tabBarInset),
    [normalize, aboveFooter, tabBarInset],
  );

  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {icon ?? (
        <FontAwesome5 name="plus" size={normalize(24)} color={colors.white} />
      )}
    </TouchableOpacity>
  );
}
