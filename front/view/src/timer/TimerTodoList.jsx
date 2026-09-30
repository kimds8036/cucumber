/**
 * 타이머 플래너 — 투두리스트 (과목 추가, 과목별 시작·정지, 접기·펼치기, 할 일 추가·체크, 길게 눌러 삭제)
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import { GuideFocusTarget } from '../../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../../src/screens/UserGuide/guideFocusTargets';
import { tdb, formatHMS, lightenHex } from './timerHelpers';

export default function TimerTodoList({
  styles,
  normalize,
  liveExtraMs,
  isViewingToday,
  isRunning,
  activeSubjectId,
  displaySubjects,
  displayTasks,
  getSubjectTotalMs,
  collapsedSubjects,
  toggleSubjectCollapsed,
  startForSubject,
  pauseTimer,
  setShowAddSubject,
  openAddTaskForSubject,
  setTaskStatus,
  deleteSubject,
  deleteTask,
  guideTarget = true,
}) {
  const Wrap = guideTarget ? GuideFocusTarget : View;
  return (
    <Wrap name={T.TIMER_TODO_COLUMN} style={[styles.todoColumn, tdb('#FF2D55')]}>
      {isViewingToday && (
        <View style={[styles.todoHeader, tdb('#64D2FF')]}>
          <TouchableOpacity
            style={styles.todoAddBtn}
            onPress={() => setShowAddSubject(true)}
          >
            <Ionicons
              name="add"
              size={14}
              color={colors.textLight4}
            />
            <Text style={styles.todoAddBtnText}>과목 추가</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        style={[styles.todoList, tdb('#AC8E68')]}
        showsVerticalScrollIndicator={false}
      >
        {displaySubjects.map((sub) => {
          const subTasks = displayTasks.filter(
            (t) => t.subjectId === sub.id,
          );
          const totalMs = getSubjectTotalMs(sub.id);
          const isThisRunning = isRunning && activeSubjectId === sub.id;
          const totalStr = isThisRunning
            ? formatHMS(totalMs + liveExtraMs)
            : formatHMS(totalMs);
          const isCollapsed = collapsedSubjects[sub.id] === true;
          return (
            <View
              key={sub.id}
              style={[styles.subjectAccordionWrap, tdb('#FF6B35')]}
            >
              <View
                style={[
                  styles.subjectBlock,
                  { backgroundColor: lightenHex(sub.color, 0.9) },
                  tdb('#7B68EE'),
                ]}
              >
                <TouchableOpacity
                  style={[styles.subjectRow, tdb('#20B2AA')]}
                  activeOpacity={1}
                  onLongPress={() => deleteSubject?.(sub)}
                  delayLongPress={350}
                  disabled={!isViewingToday}
                >
                  <View style={[styles.subjectBody, tdb('#DA70D6')]}>
                    <Text style={styles.subjectName}>{sub.name}</Text>
                    <Text style={styles.subjectTime}>{totalStr}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.subjectPlayBtn,
                      { backgroundColor: sub.color },
                      isThisRunning && styles.subjectPlayBtnActive,
                    ]}
                    onPress={() =>
                      isRunning && activeSubjectId === sub.id
                        ? pauseTimer()
                        : startForSubject(sub.id)
                    }
                    disabled={!isViewingToday}
                  >
                    <Ionicons
                      name={isThisRunning ? 'pause' : 'play'}
                      size={normalize(18)}
                      color={colors.white}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.subjectCollapseBtn}
                    onPress={() => toggleSubjectCollapsed(sub.id)}
                  >
                    <Ionicons
                      name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                      size={normalize(20)}
                      color={colors.textLight4}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
                {!isCollapsed && (
                  <View style={[styles.subjectTasksArea, tdb('#9ACD32')]}>
                    {subTasks.map((task) => (
                      <TouchableOpacity
                        key={task.id}
                        style={[styles.taskRow, tdb('#2E8B57')]}
                        activeOpacity={1}
                        onLongPress={() => deleteTask?.(task)}
                        delayLongPress={350}
                        disabled={!isViewingToday}
                      >
                        <TouchableOpacity
                          style={[
                            styles.taskCheckbox,
                            task.status === 'done' &&
                              styles.taskCheckboxChecked,
                          ]}
                          onPress={() =>
                            isViewingToday &&
                            setTaskStatus(
                              task.id,
                              task.status === 'done' ? 'pending' : 'done',
                            )
                          }
                          disabled={!isViewingToday}
                        >
                          {task.status === 'done' && (
                            <Ionicons
                              name="checkmark"
                              size={normalize(14)}
                              color={colors.white}
                            />
                          )}
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.taskContent,
                            task.status === 'done' &&
                              styles.taskContentDone,
                          ]}
                          numberOfLines={1}
                        >
                          {task.content}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.todoAddUnderSubject}
                      onPress={() => openAddTaskForSubject(sub.id)}
                      disabled={!isViewingToday}
                    >
                      <Text style={styles.todoAddUnderSubjectText}>
                        + 할 일 추가
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Wrap>
  );
}
