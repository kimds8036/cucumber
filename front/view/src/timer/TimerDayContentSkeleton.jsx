import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../components/common/Skeleton';
import { tdb } from './timerHelpers';

const TAB_LABEL_WIDTHS = [60, 72, 52, 36];

/** 타이머 카드·플래너 메뉴·투두리스트 로딩 스켈레톤. 실제 화면 칸 크기에 맞춘다. */
export default function TimerDayContentSkeleton({ styles, normalize }) {
  return (
    <>
      <View style={[styles.timerCard, tdb('#30B0C7')]}>
        <View style={styles.timerMainCol}>
          <View style={styles.dateBar}>
            <View style={[styles.dateBarRight, { marginLeft: 'auto' }]}>
              <View style={styles.timerCardIconRow}>
                <View style={styles.timerCardIconBtn}>
                  <Skeleton
                    width={normalize(16)}
                    height={normalize(16)}
                    borderRadius={normalize(4)}
                  />
                </View>
                <View style={styles.timerCardIconBtn}>
                  <Skeleton
                    width={normalize(16)}
                    height={normalize(16)}
                    borderRadius={normalize(4)}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.timerBlock}>
            <Skeleton
              width={normalize(168)}
              height={normalize(46)}
              borderRadius={normalize(8)}
              style={{ marginBottom: normalize(8) }}
            />
            <Skeleton
              width={normalize(108)}
              height={normalize(32)}
              borderRadius={normalize(24)}
            />
          </View>
        </View>
        <View style={styles.timerCardDivider} />
        <View style={styles.timerMenuCol}>
          {[0, 1, 2].map((idx) => (
            <View key={`timer-menu-skel-${idx}`} style={styles.timerMenuItem}>
              <View style={styles.timerMenuIconBox}>
                <Skeleton
                  width={normalize(22)}
                  height={normalize(22)}
                  borderRadius={normalize(11)}
                />
              </View>
              <View style={styles.timerMenuTextCol}>
                <Skeleton
                  width="78%"
                  height={normalize(10)}
                  borderRadius={normalize(4)}
                />
                <Skeleton
                  width="52%"
                  height={normalize(14)}
                  borderRadius={normalize(4)}
                />
                {idx === 1 ? (
                  <View
                    style={[
                      styles.timerMenuProgressTrack,
                      { marginTop: normalize(4) },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.plannerTabBar}>
        {TAB_LABEL_WIDTHS.map((width, idx) => (
          <View key={`timer-tab-skel-${idx}`} style={styles.plannerTab}>
            <Skeleton
              width={normalize(width)}
              height={normalize(12)}
              borderRadius={normalize(4)}
            />
            {idx === 0 ? <View style={styles.plannerTabIndicator} /> : null}
          </View>
        ))}
      </View>

      <View style={[styles.todoTimetableRow, tdb('#0A84FF')]}>
        <View style={[styles.todoColumn, tdb('#5E5CE6')]}>
          <View style={styles.todoHeader}>
            <View style={styles.todoAddBtn}>
              <Skeleton
                width={normalize(14)}
                height={normalize(14)}
                borderRadius={normalize(7)}
              />
              <Skeleton
                width={normalize(64)}
                height={normalize(12)}
                borderRadius={normalize(4)}
              />
            </View>
          </View>
          {[0, 1, 2].map((idx) => (
            <View key={`timer-subject-skel-${idx}`} style={styles.subjectBlock}>
              <View style={styles.subjectRow}>
                <View style={styles.subjectBody}>
                  <Skeleton
                    width="46%"
                    height={normalize(14)}
                    borderRadius={normalize(4)}
                  />
                  <Skeleton
                    width="28%"
                    height={normalize(12)}
                    borderRadius={normalize(4)}
                    style={{ marginTop: normalize(2) }}
                  />
                </View>
                <Skeleton
                  width={normalize(36)}
                  height={normalize(36)}
                  borderRadius={normalize(18)}
                />
                <View style={styles.subjectCollapseBtn}>
                  <Skeleton
                    width={normalize(20)}
                    height={normalize(20)}
                    borderRadius={normalize(4)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}
