import React from 'react';
import { View } from 'react-native';
import Skeleton from './Skeleton';

export default function PeriodTimesSkeleton({ normalize, rows = 6 }) {
  const n = normalize || ((v) => v);
  return (
    <View style={{ paddingHorizontal: n(4), paddingVertical: n(4) }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={`period-skel-${i}`} style={{ paddingVertical: n(12) }}>
          <Skeleton
            width={n(48)}
            height={n(14)}
            borderRadius={n(6)}
            style={{ marginBottom: n(10) }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: n(8) }}>
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={n(52)} borderRadius={n(10)} />
            </View>
            <Skeleton width={n(12)} height={n(12)} borderRadius={n(4)} />
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={n(52)} borderRadius={n(10)} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
