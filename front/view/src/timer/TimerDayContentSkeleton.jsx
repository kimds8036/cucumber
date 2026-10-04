import React from 'react';
import Skeleton from '../../../components/common/Skeleton';

/** 타이머 카드와 그 아래 플래너를 큰 블록 두 개로만 보여 준다. */
export default function TimerDayContentSkeleton({ normalize }) {
  return (
    <>
      <Skeleton
        width="100%"
        height={normalize(156)}
        borderRadius={normalize(16)}
        style={{ marginBottom: normalize(10) }}
      />
      <Skeleton
        width="100%"
        height={normalize(280)}
        borderRadius={normalize(16)}
      />
    </>
  );
}
