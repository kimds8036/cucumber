import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import { WEEKDAY_LABELS } from '../../../utils/timerWeek';

export default function TimerWeeklyPane({
  styles,
  normalize,
  tasks,
  onAdd,
  onToggle,
  onDelete,
}) {
  const [drafts, setDrafts] = useState({});

  const byWeekday = useMemo(() => {
    const map = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    (tasks || []).forEach((task) => {
      const key = Number(task.weekday);
      if (map[key]) map[key].push(task);
    });
    return map;
  }, [tasks]);

  return (
    <ScrollView
      style={styles.weeklyPaneScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {WEEKDAY_LABELS.map((label, weekday) => (
        <View key={label} style={styles.weeklyDayBlock}>
          <Text style={styles.weeklyDayTitle}>{label}</Text>
          {(byWeekday[weekday] || []).map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.weeklyTaskRow}
              activeOpacity={1}
              onLongPress={() => onDelete?.(task)}
              delayLongPress={350}
            >
              <TouchableOpacity
                style={[
                  styles.taskCheckbox,
                  task.isDone && styles.taskCheckboxChecked,
                ]}
                onPress={() => onToggle?.(task)}
              >
                {task.isDone ? (
                  <Ionicons
                    name="checkmark"
                    size={normalize(14)}
                    color={colors.textWhite}
                  />
                ) : null}
              </TouchableOpacity>
              <Text
                style={[
                  styles.weeklyTaskTitle,
                  task.isDone && styles.taskContentDone,
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.weeklyAddRow}>
            <TextInput
              style={styles.weeklyAddInput}
              placeholder="할 일 추가"
              placeholderTextColor={colors.textLight40}
              value={drafts[weekday] || ''}
              onChangeText={(text) =>
                setDrafts((prev) => ({ ...prev, [weekday]: text }))
              }
              onSubmitEditing={async () => {
                const ok = await onAdd?.(weekday, drafts[weekday]);
                if (ok) {
                  setDrafts((prev) => ({ ...prev, [weekday]: '' }));
                }
              }}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.weeklyAddBtn}
              onPress={async () => {
                const ok = await onAdd?.(weekday, drafts[weekday]);
                if (ok) {
                  setDrafts((prev) => ({ ...prev, [weekday]: '' }));
                }
              }}
            >
              <Ionicons
                name="add"
                size={normalize(18)}
                color={colors.primaryDark}
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
