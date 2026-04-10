import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, TIMETABLE_SUBJECT_COLORS } from '../styles/colors';

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const normalizeSubject = (value) => String(value || '').trim().toLowerCase();

const getSubjectColorIndex = (subject) => {
  const key = normalizeSubject(subject);
  if (!key) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash) % TIMETABLE_SUBJECT_COLORS.length;
};

const TimetableView = ({
  timetable,
  onAddOrEdit,
  editMode = false,
  onToggleEdit,
  onSaveEdit,
  onCancelEdit,
  onCellPress,
  onResetPress,
  colorSeed = 0,
}) => {
  const subjectColorMap = useMemo(() => {
    const map = {};
    if (!timetable) return map;

    const used = new Set();
    const subjects = [...new Set(
      Object.values(timetable)
        .map((v) => normalizeSubject(v))
        .filter(Boolean),
    )];

    subjects.forEach((subject) => {
      const base = getSubjectColorIndex(subject);
      let idx = base;
      // 다른 과목과 같은 색이 나오면 다음 팔레트로 이동(팔레트 크기 내에서 충돌 회피)
      for (let step = 0; step < TIMETABLE_SUBJECT_COLORS.length; step += 1) {
        idx = (base + colorSeed + step) % TIMETABLE_SUBJECT_COLORS.length;
        if (!used.has(idx)) break;
      }
      used.add(idx);
      map[subject] = TIMETABLE_SUBJECT_COLORS[idx];
    });

    return map;
  }, [timetable]);

  const getCellContent = (day, period) => {
    if (!timetable) return '';
    return timetable[`${day}-${period}`] || '';
  };

  const getCellColor = (content) => {
    const key = normalizeSubject(content);
    if (!key) return null;
    return subjectColorMap[key] || TIMETABLE_SUBJECT_COLORS[getSubjectColorIndex(key)];
  };

  if (!timetable) {
    return (
      <TouchableOpacity style={styles.addButton} onPress={onToggleEdit || onAddOrEdit}>
        <Ionicons name="calendar-outline" size={16} color={colors.textWhite} />
        <Text style={styles.addButtonText}>시간표를 추가하기</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* 헤더: 타이틀 + 수정 버튼 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>시간표</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onResetPress} activeOpacity={0.7}>
            <Ionicons name="refresh" size={14} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
        {editMode ? (
          <View style={styles.editModeActions}>
            <TouchableOpacity style={styles.editButton} onPress={onCancelEdit} activeOpacity={0.7}>
              <Text style={styles.editButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={onSaveEdit} activeOpacity={0.7}>
              <Text style={styles.editButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={onToggleEdit || onAddOrEdit} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
            <Text style={styles.editButtonText}>수정</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 시간표 그리드 */}
      <View style={styles.timetableContainer}>
        {/* 요일 헤더 */}
        <View style={styles.daysRow}>
          <View style={styles.periodHeaderCell} />
          {DAYS.map((day) => (
            <View key={day} style={styles.dayCell}>
              <Text style={styles.dayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* 교시별 행 */}
        {PERIODS.map((period) => (
          <View key={period} style={styles.row}>
            <View style={styles.periodCell}>
              <Text style={styles.periodText}>{period}</Text>
            </View>
            {DAYS.map((day) => {
              const content = getCellContent(day, period);
              const cellStyle = [
                styles.classCell,
                content ? styles.classCellFilled : null,
                content ? { backgroundColor: getCellColor(content) } : null,
              ];
              if (editMode) {
                return (
                  <TouchableOpacity
                    key={`${day}-${period}`}
                    style={cellStyle}
                    activeOpacity={0.7}
                    onPress={() => onCellPress && onCellPress(day, period)}
                  >
                    <Text
                      style={[styles.classCellText, content ? styles.classCellTextFilled : null]}
                      numberOfLines={1}
                    >
                      {content}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <View key={`${day}-${period}`} style={cellStyle}>
                  <Text
                    style={[styles.classCellText, content ? styles.classCellTextFilled : null]}
                    numberOfLines={1}
                  >
                    {content}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  editModeActions: {
    flexDirection: 'row',
    gap: 6,
  },

  // 추가 버튼 (시간표 없을 때)
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },

  // 그리드
  timetableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.textLight10,
  },
  daysRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
  },
  periodHeaderCell: {
    width: 30,
    height: 30,
    backgroundColor: colors.primary,
  },
  dayCell: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.3)',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.textLight10,
  },
  periodCell: {
    width: 30,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.textLight5,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  classCell: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.textLight10,
    backgroundColor: colors.background,
    padding: 2,
  },
  classCellFilled: {
    backgroundColor: colors.primaryLight30,
  },
  classCellText: {
    fontSize: 10,
    color: colors.textLight20,
    textAlign: 'center',
  },
  classCellTextFilled: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});

export default TimetableView;