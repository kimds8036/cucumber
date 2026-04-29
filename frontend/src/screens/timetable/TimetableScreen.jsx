import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SubHeader from '../../../view/frame/subHeader';
import { colors } from '../../../styles/colors';
import styles, { CELL_GAP, CELL_HEIGHT, DAYS, PERIODS } from './timetable.style';
import { SUBJECT_COLORS, TIMETABLE_DUMMY } from './TimetableDummy';

const COLORS = {
  ...colors,
  textDisabled: colors.textLight20,
  periodStart: colors.primary,
  periodCont: colors.primaryLight20,
  periodStartText: colors.textWhite,
  periodContText: colors.textPrimary,
};

function formatClassSummary(cls) {
  return cls.blocks
    .map((block) => `${DAYS[block.day]}${block.periods.join('')}`)
    .join(' · ');
}

function buildCellMap(myChoices) {
  const cellMap = {};

  Object.entries(myChoices).forEach(([subjectId, choice]) => {
    const subject = TIMETABLE_DUMMY.find((v) => v.id === Number(subjectId));
    if (!subject) return;
    const selectedClass = subject.classes[choice.classIdx];
    if (!selectedClass) return;

    selectedClass.blocks.forEach((block) => {
      const periods = [...block.periods].sort((a, b) => a - b);
      if (periods.length === 0) return;
      const start = periods[0];
      const span = periods.length;

      cellMap[`${block.day}-${start}`] = {
        name: subject.name,
        room: selectedClass.room,
        color: choice.color,
        isStart: true,
        span,
      };

      periods.slice(1).forEach((period) => {
        cellMap[`${block.day}-${period}`] = {
          skip: true,
        };
      });
    });
  });

  return cellMap;
}

function groupClassesByRoom(classes) {
  return classes.reduce((acc, cls, idx) => {
    if (!acc[cls.room]) acc[cls.room] = [];
    acc[cls.room].push({ cls, idx });
    return acc;
  }, {});
}

function PeriodBadges({ blocks }) {
  return (
    <View style={styles.badgeRow}>
      {blocks.map((block) => (
        <React.Fragment key={`${block.day}-${block.periods.join('-')}`}>
          <Text style={styles.daySeparator}>{DAYS[block.day]}</Text>
          {block.periods.map((period, index) => {
            const isStart = index === 0;
            return (
              <View
                key={`${block.day}-${period}`}
                style={[
                  styles.periodBadge,
                  {
                    backgroundColor: isStart ? COLORS.periodStart : COLORS.periodCont,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodBadgeText,
                    { color: isStart ? COLORS.periodStartText : COLORS.periodContText },
                  ]}
                >
                  {period}
                </Text>
              </View>
            );
          })}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function TimetableScreen() {
  const [keyword, setKeyword] = useState('');
  const [myChoices, setMyChoices] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const filteredSubjects = useMemo(() => {
    const q = keyword.trim();
    if (!q) return TIMETABLE_DUMMY;
    return TIMETABLE_DUMMY.filter((subject) => subject.name.includes(q));
  }, [keyword]);

  const cellMap = useMemo(() => buildCellMap(myChoices), [myChoices]);
  const totalTableHeight =
    PERIODS.length * CELL_HEIGHT + (PERIODS.length - 1) * CELL_GAP;

  const openBottomSheet = (subject) => {
    setSelectedSubject(subject);
    setSelectedClassIdx(myChoices[subject.id]?.classIdx ?? 0);
    setModalVisible(true);
  };

  const handleDone = () => {
    // TODO: 서버 저장 연결
  };

  const handleCompleteSelect = () => {
    if (!selectedSubject) return;
    const subjectId = selectedSubject.id;
    const existing = myChoices[subjectId];
    const defaultColor = SUBJECT_COLORS[Object.keys(myChoices).length % SUBJECT_COLORS.length];

    setMyChoices((prev) => ({
      ...prev,
      [subjectId]: {
        classIdx: selectedClassIdx,
        color: existing?.color || defaultColor,
      },
    }));
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <SubHeader title="시간표 만들기" rightLabel="완료" onRightPress={handleDone} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.schoolInfoRow}>
            <Text style={styles.schoolInfoText}>하나고등학교 · 3학년 · 2026년 1학기</Text>
            <View style={styles.neisBadge}>
              <Text style={styles.neisBadgeText}>NEIS</Text>
            </View>
          </View>

          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="과목 검색"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
          />

          <View style={styles.tableWrap}>
            <View style={styles.tableHeaderRow}>
              <View style={styles.periodHeaderCell} />
              {DAYS.map((day) => (
                <View key={day} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.tableBodyRow}>
              <View style={styles.periodCol}>
                {PERIODS.map((period) => (
                  <View key={period} style={styles.periodCell}>
                    <Text style={styles.periodText}>{period}</Text>
                  </View>
                ))}
              </View>

              {DAYS.map((_, dayIndex) => (
                <View
                  key={`day-col-${dayIndex}`}
                  style={[styles.dayCol, dayIndex === DAYS.length - 1 && styles.dayColLast]}
                >
                  {PERIODS.map((period) => (
                    <View key={`empty-${dayIndex}-${period}`} style={styles.emptyCell} />
                  ))}

                  {PERIODS.map((period) => {
                    const cell = cellMap[`${dayIndex}-${period}`];
                    if (!cell || cell.skip || !cell.isStart) return null;
                    const height = cell.span * CELL_HEIGHT + (cell.span - 1) * CELL_GAP;
                    const top = (period - 1) * (CELL_HEIGHT + CELL_GAP);

                    return (
                      <View
                        key={`block-${dayIndex}-${period}`}
                        style={[
                          styles.blockCell,
                          {
                            top,
                            height,
                            backgroundColor: cell.color,
                          },
                        ]}
                      >
                        <Text style={styles.blockTitle} numberOfLines={1}>
                          {cell.name}
                        </Text>
                        <Text style={styles.blockRoom} numberOfLines={1}>
                          {cell.room}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
            {filteredSubjects.map((subject, index) => {
              const isSelected = Boolean(myChoices[subject.id]);
              const selectedClass = isSelected
                ? subject.classes[myChoices[subject.id].classIdx]
                : null;
              const dotColor = isSelected
                ? myChoices[subject.id].color
                : COLORS.textDisabled;

              return (
                <TouchableOpacity
                  key={subject.id}
                  activeOpacity={0.75}
                  style={[styles.subjectRow, isSelected && styles.subjectRowSelected]}
                  onPress={() => openBottomSheet(subject)}
                >
                  <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
                  <View style={styles.subjectBody}>
                    <Text
                      style={[
                        styles.subjectTitle,
                        !isSelected && styles.subjectTitleDisabled,
                      ]}
                    >
                      {subject.name}
                    </Text>
                    <Text style={styles.subjectMeta}>
                      {subject.category} · {subject.units}단위 · {subject.classes.length}개 반 개설 ·{' '}
                      {selectedClass?.room || subject.classes[0]?.room || '-'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: isSelected ? myChoices[subject.id].color : COLORS.border,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <View
                        style={[
                          styles.checkCircleInner,
                          { backgroundColor: myChoices[subject.id].color },
                        ]}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.handleBar} />
            <Text style={styles.bsTitle}>{selectedSubject?.name || ''}</Text>
            <Text style={styles.bsSub}>
              {selectedSubject
                ? `${selectedSubject.category} · ${selectedSubject.units}단위 · 반 선택`
                : ''}
            </Text>
            <View style={styles.bsDivider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedSubject
                ? Object.entries(groupClassesByRoom(selectedSubject.classes)).map(
                    ([room, entries]) => (
                      <View key={room}>
                        <Text style={styles.bsRoomLabel}>{room}</Text>
                        {entries.map(({ cls, idx }) => {
                          const selected = idx === selectedClassIdx;
                          return (
                            <TouchableOpacity
                              key={`${room}-${idx}`}
                              activeOpacity={0.75}
                              style={styles.classOption}
                              onPress={() => setSelectedClassIdx(idx)}
                            >
                              <View
                                style={[
                                  styles.radioOuter,
                                  {
                                    borderColor: selected ? COLORS.primary : COLORS.border,
                                  },
                                ]}
                              >
                                {selected ? (
                                  <View
                                    style={[
                                      styles.radioDot,
                                      { backgroundColor: COLORS.primary },
                                    ]}
                                  />
                                ) : null}
                              </View>

                              <View style={styles.classInfoWrap}>
                                <Text style={styles.classMain}>
                                  {cls.classId} · {cls.teacher}
                                </Text>
                                <Text style={styles.classSchedule}>
                                  {formatClassSummary(cls)}
                                </Text>
                                <PeriodBadges blocks={cls.blocks} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ),
                  )
                : null}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.completeButton}
              onPress={handleCompleteSelect}
            >
              <Text style={styles.completeButtonText}>선택 완료</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

