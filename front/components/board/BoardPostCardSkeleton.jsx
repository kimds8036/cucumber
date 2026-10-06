import React from 'react';
import { View } from 'react-native';
import Skeleton from '../common/Skeleton';

/** BoardPostCard 로딩 자리. styles는 createBoardStyles 결과 */
export default function BoardPostCardSkeleton({ styles, normalize }) {
  return (
    <View style={styles.postItem}>
      <View style={{ flexDirection: 'row', marginBottom: normalize(8) }}>
        <Skeleton
          width={normalize(52)}
          height={normalize(12)}
          borderRadius={normalize(6)}
        />
        <View style={{ width: normalize(8) }} />
        <Skeleton
          width={normalize(44)}
          height={normalize(12)}
          borderRadius={normalize(6)}
        />
      </View>
      <Skeleton
        width="100%"
        height={normalize(14)}
        borderRadius={normalize(6)}
        style={{ marginBottom: normalize(6) }}
      />
      <Skeleton
        width="86%"
        height={normalize(14)}
        borderRadius={normalize(6)}
        style={{ marginBottom: normalize(10) }}
      />
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(12) }}
      >
        <Skeleton
          width={normalize(26)}
          height={normalize(12)}
          borderRadius={normalize(6)}
        />
        <Skeleton
          width={normalize(26)}
          height={normalize(12)}
          borderRadius={normalize(6)}
        />
        <Skeleton
          width={normalize(26)}
          height={normalize(12)}
          borderRadius={normalize(6)}
        />
      </View>
    </View>
  );
}
