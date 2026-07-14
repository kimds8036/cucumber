import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../components/common/Skeleton';
import { tdb } from './timerHelpers';

/** 타이머 카드·투두·타임테이블 로딩 스켈레톤 */
export default function TimerDayContentSkeleton({ styles, normalize }) {
  return (
    <>
      <View style={[styles.timerCard, tdb('#30B0C7')]}>
        <Skeleton
          width={normalize(180)}
          height={normalize(30)}
          borderRadius={normalize(10)}
          style={styles.timerSkelDateLine1}
        />
        <Skeleton
          width={normalize(92)}
          height={normalize(12)}
          borderRadius={normalize(6)}
          style={styles.timerSkelDateLine2}
        />
        <Skeleton
          width={normalize(140)}
          height={normalize(40)}
          borderRadius={normalize(20)}
          style={styles.timerSkelTimerBtn}
        />
      </View>

      <View style={[styles.todoTimetableRow, tdb('#0A84FF')]}>
        <View style={[styles.todoColumn, tdb('#5E5CE6')]}>
          <Skeleton
            width={normalize(80)}
            height={normalize(13)}
            borderRadius={normalize(6)}
            style={styles.timerSkelColTitle}
          />
          {[0, 1, 2].map((idx) => (
            <View
              key={`timer-task-skel-${idx}`}
              style={[styles.timerSkelTaskRow, tdb('#BF5AF2')]}
            >
              <Skeleton
                width={normalize(22)}
                height={normalize(22)}
                borderRadius={normalize(4)}
              />
              <Skeleton
                width="70%"
                height={normalize(13)}
                borderRadius={normalize(6)}
              />
            </View>
          ))}
        </View>
        <View style={[styles.timetableColumn, tdb('#FF2D55')]}>
          <Skeleton
            width={normalize(80)}
            height={normalize(13)}
            borderRadius={normalize(6)}
            style={styles.timerSkelColTitle}
          />
          {[0, 1, 2, 3].map((idx) => (
            <Skeleton
              key={`timer-table-skel-${idx}`}
              width="100%"
              height={normalize(42)}
              borderRadius={normalize(10)}
              style={styles.timerSkelTtRow}
            />
          ))}
        </View>
      </View>
    </>
  );
}
