import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../styles/colors';
import { createTimerStyles, getNormalize } from '../../../../styles/timer';

const SUBJECTS = [
  { name: '국어', color: '#F8B4C7', todo: '할 일: 국어 ~p64' },
  { name: '수학', color: '#93C5FD' },
  { name: '영어', color: '#FDBA74' },
];

export default function DummyTimer() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createTimerStyles(width, normalize), [width, normalize]);

  return (
    <View style={styles.container}>
      <View style={styles.scrollContent}>
        <View style={{ flexDirection: 'row', marginBottom: normalize(8), gap: normalize(10) }}>
          <View style={[styles.friendStoryAddCircle, { width: normalize(50), height: normalize(50) }]}>
            <Ionicons name="add" size={normalize(22)} color={colors.primary} />
          </View>
          {['홍길동', '김철수', '김영희', '김라온'].map((name, idx) => (
            <View key={name} style={{ alignItems: 'center' }}>
              <View style={[styles.friendStoryCircle, { width: normalize(50), height: normalize(50), backgroundColor: colors.green }]}>
                <Text>{name.slice(0, 1)}</Text>
                <View
                  style={[
                    styles.friendStatusDotOnCircle,
                    { backgroundColor: idx === 0 ? '#7ACC5E' : '#E9E9E9' },
                  ]}
                />
              </View>
              <Text style={styles.friendStoryName}>{name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.dateBarText}>2026.05.12</Text>
          <View style={styles.timerBlock}>
            <Text style={styles.timerTime}>05:35:16</Text>
            <View style={styles.timerBtn}>
              <Ionicons name="play" size={normalize(18)} color={colors.textWhite} />
              <Text style={styles.timerBtnText}>시작</Text>
            </View>
          </View>
        </View>

        <View style={styles.todoTimetableRow}>
          <View style={styles.todoColumn}>
            <Text style={styles.todoTitle}>투두리스트</Text>
            {SUBJECTS.map((s) => (
              <View key={s.name} style={[styles.subjectBlock, { backgroundColor: colors.surface }]}>
                <View style={styles.subjectRow}>
                  <View style={[styles.subjectColorBar, { backgroundColor: s.color }]} />
                  <View style={styles.subjectBody}>
                    <Text style={styles.subjectName}>{s.name}</Text>
                    <Text style={styles.subjectTime}>00:00:00</Text>
                    {s.todo ? <Text style={styles.todoAddUnderSubjectText}>{s.todo}</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.timetableColumn}>
            <Text style={styles.timetableTitle}>공부 기록</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: normalize(8), marginTop: normalize(16) }}>
              {[13, 14, 15, 16, 17].map((h, idx) => (
                <View key={h} style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: normalize(20),
                      height: normalize(40 + idx * 15),
                      borderRadius: 6,
                      backgroundColor: SUBJECTS[idx % SUBJECTS.length].color,
                    }}
                  />
                  <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: normalize(10) }}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
