import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../../view/frame/subHeader';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';
import styles, { CELL_GAP, CELL_HEIGHT, DAYS } from './timetable.style';
import { SUBJECT_COLORS, TIMETABLE_DUMMY } from './TimetableDummy';
import { getMaxPeriodFromTimetableKeys } from './periodUtils';

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

function buildMyPageTimetable(myChoices) {
  const timetable = {};

  Object.entries(myChoices).forEach(([subjectId, choice]) => {
    const subject = TIMETABLE_DUMMY.find((v) => v.id === Number(subjectId));
    if (!subject) return;
    const selectedClass = subject.classes[choice.classIdx];
    if (!selectedClass) return;

    selectedClass.blocks.forEach((block) => {
      const dayLabel = DAYS[block.day];
      if (!dayLabel) return;
      block.periods.forEach((period) => {
        timetable[`${dayLabel}-${period}`] = subject.name;
      });
    });
  });

  return timetable;
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

export default function TimetableScreen({ navigation, route }) {
  const [keyword, setKeyword] = useState('');
  const [myChoices, setMyChoices] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [schoolGradeText, setSchoolGradeText] = useState('-');
  const [timetableCacheKey, setTimetableCacheKey] = useState(
    route?.params?.timetableCacheKey || '@mypage_timetable_cache_v1',
  );
  const resolveTimetableCacheKey = useCallback(async () => {
    if (route?.params?.timetableCacheKey) {
      return route.params.timetableCacheKey;
    }
    try {
      const res = await api.get('/api/auth/me');
      const me = res.data?.data;
      const userScope =
        me?.id != null ? String(me.id) : me?.username || me?.email || null;
      if (userScope) return `@mypage_timetable_cache_v1:${userScope}`;
    } catch (e) {
      console.warn('[TimetableScreen] 시간표 캐시 키 계산 실패:', e?.message || e);
    }
    return '@mypage_timetable_cache_v1';
  }, [route?.params?.timetableCacheKey]);
  const termTitle = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const semester = month >= 2 && month <= 7 ? '1학기' : '2학기';
    return `${year}년 ${semester}`;
  }, []);

  const filteredSubjects = useMemo(() => {
    const q = keyword.trim();
    if (!q) return TIMETABLE_DUMMY;
    return TIMETABLE_DUMMY.filter((subject) => subject.name.includes(q));
  }, [keyword]);

  const cellMap = useMemo(() => buildCellMap(myChoices), [myChoices]);
  const previewTimetable = useMemo(() => buildMyPageTimetable(myChoices), [myChoices]);
  const maxPeriod = useMemo(
    () => getMaxPeriodFromTimetableKeys(previewTimetable, 7),
    [previewTimetable],
  );
  const periods = useMemo(() => {
    const upperBound = maxPeriod <= 9 ? 9 : maxPeriod;
    return Array.from({ length: upperBound }, (_, i) => i + 1);
  }, [maxPeriod]);
  const totalTableHeight =
    periods.length * CELL_HEIGHT + (periods.length - 1) * CELL_GAP;

  const openBottomSheet = (subject) => {
    setSelectedSubject(subject);
    setSelectedClassIdx(myChoices[subject.id]?.classIdx ?? 0);
    setModalVisible(true);
  };

  const handleDone = async () => {
    const nextTimetable = buildMyPageTimetable(myChoices);
    const hasEntries = Object.keys(nextTimetable).length > 0;
    if (!hasEntries) return;

    try {
      const keyToUse = await resolveTimetableCacheKey();
      await AsyncStorage.setItem(
        keyToUse,
        JSON.stringify({
          ts: Date.now(),
          timetable: nextTimetable,
          clearedByUser: false,
        }),
      );
    } catch (error) {
      console.warn(
        '[TimetableScreen] MyPage 시간표 캐시 저장 실패:',
        error?.message || error,
      );
    }

    navigation.navigate('Main', { initialTab: 'mypage' });
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

  useEffect(() => {
    let mounted = true;

    const fetchSchoolAndGrade = async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (!mounted) return;

        const me = res.data?.data;
        const userScope =
          me?.id != null ? String(me.id) : me?.username || me?.email || null;
        if (userScope) {
          setTimetableCacheKey(`@mypage_timetable_cache_v1:${userScope}`);
        }
        const schoolName = me?.school?.name || '-';
        const gradeText = me?.grade ? `${me.grade}학년` : '';
        setSchoolGradeText(gradeText ? `${schoolName} · ${gradeText}` : schoolName);
      } catch (error) {
        if (mounted) {
          setSchoolGradeText('-');
        }
        console.warn(
          '[TimetableScreen] 사용자 학교/학년 조회 실패:',
          error?.response?.data || error?.message || error,
        );
      }
    };

    fetchSchoolAndGrade();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title={termTitle}
        onBack={() => navigation.goBack()}
        rightButtonText="완료"
        onRightPress={handleDone}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.schoolInfoRow}>
            <Text style={styles.schoolInfoText}>{schoolGradeText}</Text>
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
                {periods.map((period) => (
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
                  {periods.map((period) => (
                    <View key={`empty-${dayIndex}-${period}`} style={styles.emptyCell} />
                  ))}

                  {periods.map((period) => {
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
    </SafeAreaView>
  );
}

