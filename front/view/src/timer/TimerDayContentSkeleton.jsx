import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../components/common/Skeleton';
import { tdb } from './timerHelpers';

/** 타이머 카드·플래너 메뉴·투두리스트 로딩 스켈레톤 */
export default function TimerDayContentSkeleton({ styles, normalize }) {
  return (
    <>
      <View style={[styles.timerCard, tdb('#30B0C7')]}>
        <View style={[styles.timerMainCol, { justifyContent: 'center' }]}>
          <Skeleton
            width={normalize(160)}
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
            width={normalize(120)}
            height={normalize(40)}
            borderRadius={normalize(20)}
            style={styles.timerSkelTimerBtn}
          />
        </View>
        <View style={styles.timerCardDivider} />
        <View style={styles.timerMenuCol}>
          {[0, 1, 2].map((idx) => (
            <View key={`timer-menu-skel-${idx}`} style={styles.timerMenuItem}>
              <Skeleton
                width={normalize(22)}
                height={normalize(22)}
                borderRadius={normalize(11)}
              />
              <View style={styles.timerMenuTextCol}>
                <Skeleton
                  width="80%"
                  height={normalize(9)}
                  borderRadius={normalize(4)}
                  style={{ marginBottom: normalize(4) }}
                />
                <Skeleton
                  width="55%"
                  height={normalize(13)}
                  borderRadius={normalize(6)}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.plannerTabBar}>
        {[0, 1, 2, 3].map((idx) => (
          <View key={`timer-tab-skel-${idx}`} style={styles.plannerTab}>
            <Skeleton
              width={normalize(50)}
              height={normalize(12)}
              borderRadius={normalize(6)}
            />
          </View>
        ))}
      </View>

      <View style={[styles.todoTimetableRow, tdb('#0A84FF')]}>
        <View style={[styles.todoColumn, tdb('#5E5CE6')]}>
          <View style={styles.todoHeader}>
            <Skeleton
              width={normalize(70)}
              height={normalize(28)}
              borderRadius={normalize(10)}
            />
          </View>
          {[0, 1, 2].map((idx) => (
            <Skeleton
              key={`timer-subject-skel-${idx}`}
              width="100%"
              height={normalize(48)}
              borderRadius={normalize(12)}
              style={styles.timerSkelSubjectBlock}
            />
          ))}
        </View>
      </View>
    </>
  );
}
