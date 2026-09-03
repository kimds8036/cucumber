import React from 'react';
import { View } from 'react-native';
import { colors } from '../../../styles/colors';

const PolicyDocumentSkeleton = ({ styles, normalize }) => (
  <View style={{ gap: normalize(10) }}>
    {[0.62, 0.48, 0.38].map((ratio, index) => (
      <View
        key={`meta-${index}`}
        style={{
          width: `${Math.round(ratio * 100)}%`,
          height: normalize(14),
          borderRadius: normalize(4),
          backgroundColor: colors.textLight10,
          opacity: 0.55 - index * 0.05,
        }}
      />
    ))}
    <View style={styles.divider} />
    {[1, 0.96, 0.9, 1, 0.72, 0.94, 0.86, 1, 0.68].map((ratio, index) => (
      <View
        key={`line-${index}`}
        style={{
          width: `${Math.round(ratio * 100)}%`,
          height: normalize(12),
          borderRadius: normalize(4),
          backgroundColor: colors.textLight10,
          opacity: 0.42 + (index % 3) * 0.06,
        }}
      />
    ))}
  </View>
);

export default PolicyDocumentSkeleton;
