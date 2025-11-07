import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export const Logo = () => (
  <View style={styles.container}>
    <View style={styles.circle}>
      <View style={styles.loadingIcon}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { transform: [{ rotate: `${i * 45}deg` }] }]}
          />
        ))}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 80 },
  circle: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.brand,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: { width: 40, height: 40 },
  dot: {
    position: 'absolute',
    width: 6,
    height: 14,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    left: 17,
    top: 0,
  },
});