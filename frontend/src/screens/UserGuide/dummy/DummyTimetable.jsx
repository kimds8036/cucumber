import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../../styles/colors';
import { createMyPageStyles, getNormalize } from '../../../../styles/mypage.style';

const DAYS = ['월', '화', '수', '목', '금'];
const TABLE = [
  ['영어', '역사', '국어', '도덕', '영어'],
  ['미술', '기술·가정', '진로와직업', '영어', '체육'],
  ['미술', '과학', '역사', '과학', '과학'],
  ['기술·가정', '수학', '체육', '국어', '영어'],
  ['수학', '사회', '과학', '체육', '기술·가정'],
  ['국어', '영어', '동아리활동', '수학', '사회'],
  ['동아리활동', '국어', '', '', '자율활동'],
];

export default function DummyTimetable() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMyPageStyles(normalize), [normalize]);

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.profileCircle}>
            <Text>홍</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>홍길동</Text>
            <Text style={styles.profileUsername}>@honggildong</Text>
            <Text style={styles.profileSchool}>한국중학교 3학년 2반</Text>
            <Text style={styles.profileSchool}>친구 13 · 게시글 24 · 스크랩 0</Text>
          </View>
        </View>

        <View style={{ marginTop: normalize(16), borderWidth: 1, borderColor: colors.textLight10, borderRadius: 10 }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
            <View style={{ width: normalize(24), borderRightWidth: 1, borderColor: colors.textLight10 }} />
            {DAYS.map((d) => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRightWidth: 1, borderColor: colors.textLight10 }}>
                <Text style={{ color: colors.textSecondary }}>{d}</Text>
              </View>
            ))}
          </View>
          {TABLE.map((row, i) => (
            <View key={`r-${i}`} style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.textLight10 }}>
              <View style={{ width: normalize(24), alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: colors.textLight10 }}>
                <Text style={{ fontSize: normalize(10), color: colors.textSecondary }}>{i + 1}</Text>
              </View>
              {row.map((cell, ci) => (
                <View key={`c-${i}-${ci}`} style={{ flex: 1, minHeight: normalize(26), justifyContent: 'center', paddingHorizontal: 4, borderRightWidth: 1, borderColor: colors.textLight10 }}>
                  <Text numberOfLines={1} style={{ fontSize: normalize(10), color: colors.textPrimary, textAlign: 'center' }}>
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: normalize(18), marginTop: normalize(14) }}>
          <Ionicons name="refresh" size={normalize(20)} color={colors.textSecondary} />
          <Ionicons name="create-outline" size={normalize(20)} color={colors.textSecondary} />
          <Ionicons name="download-outline" size={normalize(20)} color={colors.textSecondary} />
        </View>
      </View>
    </View>
  );
}
