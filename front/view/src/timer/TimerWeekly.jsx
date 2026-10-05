/**
 * 타이머 플래너 — 위클리 (일~토 세로 배치, 요일별 체크리스트, 길게 눌러 삭제)
 * 체크 개수로 시간 카드의 「위클리 달성률」을 계산한다. 항목은 계정 DB에 남는다.
 */
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import Skeleton from '../../../components/common/Skeleton';
import TimerDatePicker from './TimerDatePicker';
import { TIMER_WEEKLY_ITEM_MAX } from './timerHelpers';
import { dateFromKey, WEEKLY_MIN_WEEK_KEY } from './useTimerWeekly';

const pad2 = (n) => String(n).padStart(2, '0');

export default function TimerWeekly({ styles, normalize, weekly }) {
  const [addingDayKey, setAddingDayKey] = useState(null);
  const [draft, setDraft] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const addingRef = useRef(null);
  const draftRef = useRef('');

  if (!weekly) return null;
  const {
    days,
    itemsByDay,
    todayKey,
    addItem,
    toggleItem,
    removeItem,
    shiftWeek,
    selectDate,
    loaded,
  } = weekly;

  const changeDraft = (text) => {
    const next = String(text || '').slice(0, TIMER_WEEKLY_ITEM_MAX);
    draftRef.current = next;
    setDraft(next);
  };

  const commitDraft = () => {
    if (addingRef.current && draftRef.current.trim()) {
      addItem(addingRef.current, draftRef.current);
    }
    changeDraft('');
  };

  const startAdding = (dayKey) => {
    commitDraft();
    addingRef.current = dayKey;
    setAddingDayKey(dayKey);
  };

  const finishAdding = (dayKey) => {
    if (addingRef.current !== dayKey) return;
    commitDraft();
    addingRef.current = null;
    setAddingDayKey(null);
  };

  const submitAndContinue = (dayKey) => {
    if (!draftRef.current.trim()) {
      finishAdding(dayKey);
      return;
    }
    commitDraft();
  };

  const confirmRemove = (dayKey, item) => {
    Alert.alert('할 일 삭제', '이 할 일을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeItem(dayKey, item.id) },
    ]);
  };

  const first = days[0];
  const last = days[days.length - 1];
  const rangeLabel = `${first.year}.${pad2(first.month)}.${pad2(first.date)}~${pad2(last.month)}.${pad2(last.date)}`;

  const shift = (delta) => {
    commitDraft();
    addingRef.current = null;
    setAddingDayKey(null);
    shiftWeek(delta);
  };

  const canPrevWeek = first.dayKey > WEEKLY_MIN_WEEK_KEY;

  return (
    <View style={styles.weeklyWrap}>
      <View style={styles.grassHeader}>
        <TouchableOpacity
          style={styles.grassNavBtn}
          onPress={() => shift(-1)}
          disabled={!canPrevWeek}
          accessibilityLabel="이전 주"
        >
          <Ionicons
            name="caret-back"
            size={normalize(14)}
            color={canPrevWeek ? colors.text : colors.textLight2}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.grassMonthBtn}
          onPress={() => setPickerVisible(true)}
          accessibilityLabel="날짜 선택"
        >
          <Text style={styles.grassMonthLabel}>{rangeLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.grassNavBtn}
          onPress={() => shift(1)}
          accessibilityLabel="다음 주"
        >
          <Ionicons name="caret-forward" size={normalize(14)} color={colors.text} />
        </TouchableOpacity>
      </View>
      <TimerDatePicker
        visible={pickerVisible}
        value={dateFromKey(first.dayKey)}
        title="주 선택"
        onConfirm={selectDate}
        onClose={() => setPickerVisible(false)}
        styles={styles}
        normalize={normalize}
      />
      {days.map((day) => {
        const items = itemsByDay[day.dayKey] ?? [];
        const isToday = day.dayKey === todayKey;
        const isAdding = addingDayKey === day.dayKey;
        return (
          <View
            key={day.dayKey}
            style={[styles.weeklyDayRow, isToday && styles.weeklyDayRowToday]}
          >
            <View style={styles.weeklyDayLabelCol}>
              <Text
                style={[
                  styles.weeklyDayLabel,
                  day.label === '일' && styles.weekCalSunday,
                  day.label === '토' && styles.weekCalSaturday,
                ]}
              >
                {day.label}
              </Text>
              <Text
                style={[
                  styles.weeklyDayDate,
                  day.label === '일' && styles.weekCalSunday,
                  day.label === '토' && styles.weekCalSaturday,
                ]}
              >
                {day.date}
              </Text>
            </View>
            <View style={styles.weeklyDayBody}>
              {!loaded ? (
                <Skeleton
                  width="70%"
                  height={normalize(14)}
                  borderRadius={normalize(6)}
                  style={{ marginVertical: normalize(8) }}
                />
              ) : (
                <>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.weeklyItemRow}
                      activeOpacity={1}
                      onLongPress={() => confirmRemove(day.dayKey, item)}
                      delayLongPress={350}
                    >
                      <TouchableOpacity
                        style={[styles.taskCheckbox, item.done && styles.taskCheckboxChecked]}
                        onPress={() => toggleItem(day.dayKey, item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        {item.done ? (
                          <Ionicons name="checkmark" size={normalize(14)} color={colors.white} />
                        ) : null}
                      </TouchableOpacity>
                      <Text
                        style={[styles.weeklyItemText, item.done && styles.taskContentDone]}
                        numberOfLines={2}
                      >
                        {item.content}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {isAdding ? (
                    <View style={styles.weeklyItemRow}>
                      <View style={styles.taskCheckbox} />
                      <TextInput
                        style={styles.weeklyInput}
                        value={draft}
                        onChangeText={changeDraft}
                        placeholder="할 일 입력"
                        placeholderTextColor={colors.textLight3}
                        maxLength={TIMER_WEEKLY_ITEM_MAX}
                        autoFocus
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={() => submitAndContinue(day.dayKey)}
                        onBlur={() => finishAdding(day.dayKey)}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.weeklyAddBtn}
                      onPress={() => startAdding(day.dayKey)}
                      hitSlop={{ top: 4, bottom: 4 }}
                    >
                      <Text style={styles.weeklyAddBtnText}>+ 할 일 추가</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
