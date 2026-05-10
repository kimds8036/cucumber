import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';

/** MyPage 등에서 넘긴 existingTimetable 만 수정·삭제 (빈 칸 과목 추가 불가) */
const EditTimetable = ({ navigation, route }) => {
  const { existingTimetable, onSave, timetableCacheKey } = route.params || {};

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [timetable, setTimetable] = useState(() =>
    existingTimetable && typeof existingTimetable === 'object'
      ? { ...existingTimetable }
      : {},
  );

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const hasEditableCells = useCallback((tt) => {
    if (!tt || typeof tt !== 'object') return false;
    return Object.keys(tt).some((k) => String(tt[k] || '').trim().length > 0);
  }, []);

  useEffect(() => {
    if (!hasEditableCells(existingTimetable)) {
      Alert.alert('알림', '수정할 시간표가 없습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setTimetable({ ...existingTimetable });
  }, [existingTimetable, hasEditableCells, navigation]);

  const handleCellPress = (day, period) => {
    const key = `${day}-${period}`;
    const current = String(timetable[key] || '').trim();
    if (!current) return;

    setSelectedDay(day);
    setSelectedPeriod(period);
    setClassName(timetable[key] || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setClassName('');
    setSelectedDay(null);
    setSelectedPeriod(null);
  };

  const handleConfirmEdit = () => {
    if (className.trim() === '') {
      Alert.alert('알림', '과목명을 입력해주세요.');
      return;
    }

    const key = `${selectedDay}-${selectedPeriod}`;
    setTimetable((prev) => ({
      ...prev,
      [key]: className.trim(),
    }));

    closeModal();
  };

  const handleDeleteClass = () => {
    const key = `${selectedDay}-${selectedPeriod}`;
    setTimetable((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    closeModal();
  };

  const handleSave = async () => {
    try {
      if (onSave) {
        onSave(timetable);
      }
      if (timetableCacheKey) {
        await AsyncStorage.setItem(
          timetableCacheKey,
          JSON.stringify({
            ts: Date.now(),
            timetable,
            clearedByUser: false,
          }),
        );
      }
    } catch (error) {
      console.error('시간표 저장 실패:', error);
    }

    Alert.alert('저장 완료', '시간표가 저장되었습니다.', [
      {
        text: '확인',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const getCellContent = (day, period) => {
    const key = `${day}-${period}`;
    return timetable[key] || '';
  };

  if (!hasEditableCells(existingTimetable)) {
    return (
      <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
        <SafeAreaView style={styles.container} edges={['top']} />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <SubHeader
          title="시간표 편집"
          onBack={() => navigation.goBack()}
          rightButtonText="저장"
          onRightPress={handleSave}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.timetableContainer}>
            <View style={styles.daysRow}>
              <View style={styles.periodHeader} />
              {days.map((day) => (
                <View key={day} style={styles.dayCell}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
              ))}
            </View>

            {periods.map((period) => (
              <View key={period} style={styles.row}>
                <View style={styles.periodCell}>
                  <Text style={styles.periodText}>{period}</Text>
                </View>
                {days.map((day) => {
                  const content = getCellContent(day, period);
                  const filled = Boolean(String(content).trim());
                  const CellWrapper = filled ? TouchableOpacity : View;
                  const cellProps = filled
                    ? {
                        activeOpacity: 0.7,
                        onPress: () => handleCellPress(day, period),
                      }
                    : {};

                  return (
                    <CellWrapper
                      key={`${day}-${period}`}
                      style={[
                        styles.classCell,
                        filled ? styles.classCellFilled : styles.classCellEmpty,
                      ]}
                      {...cellProps}
                    >
                      <Text
                        style={[
                          styles.classCellText,
                          filled ? styles.classCellTextFilled : null,
                        ]}
                        numberOfLines={2}
                      >
                        {content}
                      </Text>
                    </CellWrapper>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedDay}요일 {selectedPeriod}교시
              </Text>
              <TextInput
                style={styles.input}
                placeholder="과목명"
                value={className}
                onChangeText={setClassName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteClass}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleConfirmEdit}
                >
                  <Text style={styles.confirmButtonText}>수정</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  timetableContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  daysRow: {
    flexDirection: 'row',
    backgroundColor: '#8FD397',
  },
  periodHeader: {
    width: 40,
    height: 40,
    backgroundColor: '#8FD397',
  },
  dayCell: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#fff',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  periodCell: {
    width: 40,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  classCell: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    padding: 4,
  },
  classCellFilled: {
    backgroundColor: '#f0f9f1',
  },
  classCellEmpty: {
    backgroundColor: '#fafafa',
  },
  classCellText: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
  },
  classCellTextFilled: {
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
  },
  confirmButton: {
    backgroundColor: '#8FD397',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});

export default EditTimetable;
