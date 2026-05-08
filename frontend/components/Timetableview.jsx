import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import AppPopupModal from '../components/common/AppPopupModal';
import { colors } from '../styles/colors';
import { TIMETABLE_SUBJECT_COLORS } from '../styles/colors';
import { getNormalize } from '../styles/mypage.style';
import { createTimetableViewStyles } from '../src/screens/timetable/timetable.style';

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
  onNavigateToEdit,
  onResetPress,
  colorSeed = 0,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createTimetableViewStyles(normalize), [normalize]);
  const captureTimetableRef = useRef(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const safeTimetable = timetable || {};

  const subjectColorMap = useMemo(() => {
    const map = {};
    if (!safeTimetable) return map;

    const used = new Set();
    const subjects = [...new Set(
      Object.values(safeTimetable)
        .map((v) => normalizeSubject(v))
        .filter(Boolean),
    )];

    subjects.forEach((subject) => {
      const base = getSubjectColorIndex(subject);
      let idx = base;
      for (let step = 0; step < TIMETABLE_SUBJECT_COLORS.length; step += 1) {
        idx = (base + colorSeed + step) % TIMETABLE_SUBJECT_COLORS.length;
        if (!used.has(idx)) break;
      }
      used.add(idx);
      map[subject] = TIMETABLE_SUBJECT_COLORS[idx];
    });

    return map;
  }, [safeTimetable, colorSeed]);

  const getCellContent = (day, period) => {
    return safeTimetable[`${day}-${period}`] || '';
  };

  const getCellColor = (content) => {
    const key = normalizeSubject(content);
    if (!key) return null;
    return subjectColorMap[key] || TIMETABLE_SUBJECT_COLORS[getSubjectColorIndex(key)];
  };

  const handleSaveAsImage = useCallback(async () => {
    if (!captureTimetableRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 저장을 위해 갤러리 접근 권한이 필요해요');
        return;
      }
      const uri = await captureTimetableRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      setShowSaveModal(true);
    } catch (e) {
      Alert.alert('저장 실패', e?.message || '이미지 저장에 실패했어요. 다시 시도해 주세요');
    }
  }, []);

  return (
    <>
    <View style={styles.wrapper}>
      <View style={styles.timetableContainer}>
        <ViewShot
          ref={captureTimetableRef}
          options={{ format: 'png', quality: 1 }}
          style={styles.timetableViewShot}
          collapsable={false}
        >
          <View style={styles.daysRow}>
            <View style={styles.periodHeaderCell} />
            {DAYS.map((day) => (
              <View key={day} style={styles.dayCell}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>

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
                return (
                  <View key={`${day}-${period}`} style={cellStyle}>
                    <Text
                      style={[styles.classCellText, content ? styles.classCellTextFilled : null]}
                      lineBreakMode="wordWrapping"
                      lineBreakStrategyIOS="hangul-word"
                    >
                      {content}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </ViewShot>

        <View style={styles.mergedFooterRow}>
          <View style={styles.mergedFooterFullCell} pointerEvents="box-none">
            <View style={styles.mergedFooterActionRow}>
              <TouchableOpacity style={styles.refreshButton} onPress={onResetPress} activeOpacity={0.7}>
                <Text style={styles.footerResetLabel}>초기화</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={onNavigateToEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.footerResetLabel}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleSaveAsImage}
                activeOpacity={0.7}
              >
                <Text style={styles.footerResetLabel}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>

    <AppPopupModal
      visible={showSaveModal}
      onClose={() => setShowSaveModal(false)}
      dismissOnBackdrop={false}
    >
      <Text
        style={{
          fontSize: 18,
          color: colors.textPrimary,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        저장 완료
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 16,
        }}
      >
        갤러리에 저장되었어요
      </Text>
      <TouchableOpacity
        style={{
          height: 42,
          borderRadius: 10,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => setShowSaveModal(false)}
        activeOpacity={0.85}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: colors.textWhite,
          }}
        >
          확인
        </Text>
      </TouchableOpacity>
    </AppPopupModal>
    </>
  );
};

export default TimetableView;
