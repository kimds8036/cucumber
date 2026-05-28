import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createOurSchoolStyles } from '../../../../styles/school.style';
import { getNormalize } from '../../../../styles/frame.style';
import { colors } from '../../../../styles/colors';

const MEALS = [
  ['기장밥', '순대국', '오이도라지…', '교자만두구이', '석박지', '적포도'],
  ['추가밥&김자반', '자계치', '짬뽕국', '유린기', '깍두기', '마시는요구…'],
  ['마카니커리…', '샤브샤브국', '김가루청포묵', '소목살스테…', '깍두기', '사과주스'],
];

const GRASS_MONTHS = ['3월', '4월', '5월', '6월', '7월', '8월'];

export default function DummySchool() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createOurSchoolStyles(normalize), [normalize]);

  return (
    <View style={styles.container}>
      <View style={styles.scrollContent}>
        <View style={styles.schoolCardBlock}>
          <View style={styles.schoolCard}>
            <View style={styles.schoolNameRow}>
              <Text style={styles.schoolName}>한국고등학교</Text>
            </View>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={normalize(14)} color={colors.textSecondary} />
              <Text style={styles.locationText}>서울특별시 대한구 민국동</Text>
            </View>
            <View style={styles.schoolInfoDivider} />
            <View style={styles.statsContainer}>
              <Text style={styles.statValue}>217명</Text>
              <Text style={styles.statValue}>429개</Text>
              <Text style={styles.statValue}>76개</Text>
            </View>
          </View>
        </View>

        <View style={styles.mealCardBlock}>
          <View style={styles.mealSectionCard}>
            <Text style={styles.mealSectionTitle}>급식</Text>
            <View style={styles.mealSlotsRow}>
              {MEALS.map((menus, idx) => (
                <View key={`meal-${idx}`} style={styles.mealSlot}>
                  <View style={styles.mealCard}>
                    <View style={styles.mealSlotHeader}>
                      <Text style={styles.mealSlotTitle}>중식</Text>
                      <View style={styles.mealSlotBadge}>
                        <Text style={styles.mealSlotBadgeText}>{['월', '화', '수'][idx]}</Text>
                      </View>
                    </View>
                    <View style={styles.mealSlotMenus}>
                      {menus.map((m) => (
                        <Text key={m} style={styles.mealSlotMenuText} numberOfLines={1}>
                          {m}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.grassCard}>
          <Text style={styles.grassCardTitle}>우리 학교 공부 잔디밭</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {GRASS_MONTHS.map((m, idx) => (
              <View key={m} style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: normalize(10), marginBottom: normalize(6) }}>
                  {m}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[0, 1, 2, 3].map((c) => (
                    <View
                      key={`${m}-${c}`}
                      style={{
                        width: normalize(8),
                        height: normalize(8),
                        borderRadius: 2,
                        backgroundColor: c <= (idx % 4) ? colors.primary : colors.textLight10,
                      }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.shortcutContainer}>
          <TouchableOpacity style={styles.shortcutButton} activeOpacity={1}>
            <View style={styles.shortcutTopRow}>
              <Ionicons name="chatbubbles" size={normalize(22)} color={colors.primary} />
              <Text style={styles.shortcutTitle}>학교 게시판</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutButton} activeOpacity={1}>
            <View style={styles.shortcutTopRow}>
              <Ionicons name="mail" size={normalize(22)} color={colors.primary} />
              <Text style={styles.shortcutTitle}>학교 우편함</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
