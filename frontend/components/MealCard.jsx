import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../styles/colors";
import { useMealData } from "../hooks/useMealData.js";

/**
 * useMealData(schulCode)로 오늘 이후 급식 3건 표시.
 * 로딩 시 스켈레톤, 데이터 없을 때 "오늘은 급식이 없어요" 중앙 정렬.
 */
export default function MealCard({ schulCode, atptCode = "" }) {
  const { upcomingMeals: meals, loading: isLoading, error: err } = useMealData(
    schulCode,
    atptCode
  );

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "70%", marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: "50%", marginTop: 8 }]} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>{err}</Text>
      </View>
    );
  }

  if (!meals || meals.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>오늘은 급식이 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {meals.map((item, index) => (
        <View key={`${item.date}-${item.mealType}-${index}`} style={styles.row}>
          <Text style={styles.dateBadge}>
            {item.date.slice(6, 8)}/{item.date.slice(4, 6)} ({item.dayBadge}) {item.mealType}
          </Text>
          <Text style={styles.menu} numberOfLines={2}>
            {Array.isArray(item.menu) ? item.menu.join(", ") : ""}
          </Text>
          {item.calories ? (
            <Text style={styles.calories}>{item.calories}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    textAlign: "center",
    color: colors.alert,
    fontSize: 14,
  },
  row: {
    marginBottom: 12,
  },
  dateBadge: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  menu: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  calories: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
</think>
MealCard에서 훅을 중복 호출하고 require를 잘못 사용했습니다. 수정 중입니다.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace