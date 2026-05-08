import React from 'react';
import { Text, View } from 'react-native';

export default function AdSection({ styles, label = '광고' }) {
  return (
    <View style={styles.adSection}>
      <Text style={styles.adSectionText}>{label}</Text>
    </View>
  );
}
