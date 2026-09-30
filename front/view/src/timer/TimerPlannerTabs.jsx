/**
 * 타이머 플래너 메뉴 — 투두리스트 · 타임테이블 · 공부 잔디 · 위클리
 * 메뉴 줄(TimerPlannerTabBar)은 시간 카드와 함께 고정되고, 내용(TimerPlannerTabs)은 그 아래에서 스크롤된다.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import TimerTodoList from './TimerTodoList';
import TimerTimetable from './TimerTimetable';
import TimerStudyGrass from './TimerStudyGrass';
import TimerWeekly from './TimerWeekly';

export const PLANNER_TABS = [
  { key: 'todo', label: '투두리스트' },
  { key: 'timetable', label: '타임테이블' },
  { key: 'grass', label: '공부 잔디' },
  { key: 'weekly', label: '위클리' },
];

export function TimerPlannerTabBar({ value, onChange, styles, tabs = PLANNER_TABS }) {
  return (
    <View style={styles.plannerTabBar}>
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.plannerTab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[styles.plannerTabText, active && styles.plannerTabTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {active ? <View style={styles.plannerTabIndicator} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TimerPlannerTabs({ value, ...panelProps }) {
  switch (value) {
    case 'todo':
      return <TimerTodoList {...panelProps} />;
    case 'timetable':
      return (
        <TimerTimetable
          styles={panelProps.styles}
          displaySessions={panelProps.displaySessions}
          displaySubjects={panelProps.displaySubjects}
        />
      );
    case 'grass':
      return (
        <TimerStudyGrass
          styles={panelProps.styles}
          normalize={panelProps.normalize}
          onOpenDayRecord={panelProps.onOpenDayRecord}
        />
      );
    case 'weekly':
      return <TimerWeekly />;
    default:
      return null;
  }
}
