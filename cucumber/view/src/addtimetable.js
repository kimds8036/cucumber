import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const AddTimetable = ({ navigation, route }) => {
  // MyPage에서 전달받은 기존 시간표와 저장 함수
  const { existingTimetable, onSave } = route.params || {};
  
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [timetable, setTimetable] = useState(existingTimetable || {});

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleCellPress = (day, period) => {
    setSelectedDay(day);
    setSelectedPeriod(period);
    
    // 이미 입력된 과목이 있으면 수정 모드
    const key = `${day}-${period}`;
    if (timetable[key]) {
      setClassName(timetable[key]);
    }
    
    setModalVisible(true);
  };

  const handleAddClass = () => {
    if (className.trim() === '') {
      Alert.alert('알림', '과목명을 입력해주세요.');
      return;
    }

    const key = `${selectedDay}-${selectedPeriod}`;
    setTimetable({
      ...timetable,
      [key]: className,
    });

    setClassName('');
    setModalVisible(false);
    setSelectedDay(null);
    setSelectedPeriod(null);
  };

  const handleDeleteClass = () => {
    const key = `${selectedDay}-${selectedPeriod}`;
    const newTimetable = { ...timetable };
    delete newTimetable[key];
    setTimetable(newTimetable);
    
    setClassName('');
    setModalVisible(false);
    setSelectedDay(null);
    setSelectedPeriod(null);
  };

  const handleSave = () => {
    // 시간표가 비어있는지 확인
    if (Object.keys(timetable).length === 0) {
      Alert.alert(
        '시간표가 비어있습니다',
        '최소 1개 이상의 과목을 추가해주세요.',
        [{ text: '확인' }]
      );
      return;
    }

    // MyPage로 시간표 데이터 전달
    if (onSave) {
      onSave(timetable);
    }
    
    Alert.alert(
      '저장 완료',
      '시간표가 저장되었습니다.',
      [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getCellContent = (day, period) => {
    const key = `${day}-${period}`;
    return timetable[key] || '';
  };

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SubHeader
          title="시간표 편집"
          onBack={() => navigation.goBack()}
          rightButtonText="저장"
          onRightPress={handleSave}
        />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.timetableContainer}>
          {/* Days Header */}
          <View style={styles.daysRow}>
            <View style={styles.periodHeader} />
            {days.map((day) => (
              <View key={day} style={styles.dayCell}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Timetable Grid */}
          {periods.map((period) => (
            <View key={period} style={styles.row}>
              <View style={styles.periodCell}>
                <Text style={styles.periodText}>{period}</Text>
              </View>
              {days.map((day) => {
                const content = getCellContent(day, period);
                return (
                  <TouchableOpacity
                    key={`${day}-${period}`}
                    style={[
                      styles.classCell,
                      content ? styles.classCellFilled : null,
                    ]}
                    onPress={() => handleCellPress(day, period)}
                  >
                    <Text
                      style={[
                        styles.classCellText,
                        content ? styles.classCellTextFilled : null,
                      ]}
                      numberOfLines={2}
                    >
                      {content}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            시간표를 탭하여 과목을 추가/수정하세요
          </Text>
        </View>
      </ScrollView>
      </SafeAreaView>

      {/* Add/Edit Class Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDay}요일 {selectedPeriod}교시
            </Text>
            <TextInput
              style={styles.input}
              placeholder="과목명을 입력하세요"
              value={className}
              onChangeText={setClassName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setClassName('');
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              
              {/* 이미 과목이 있으면 삭제 버튼 표시 */}
              {timetable[`${selectedDay}-${selectedPeriod}`] && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteClass}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddClass}
              >
                <Text style={styles.confirmButtonText}>
                  {timetable[`${selectedDay}-${selectedPeriod}`] ? '수정' : '추가'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 8,
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
    backgroundColor: '#fff',
    padding: 4,
  },
  classCellFilled: {
    backgroundColor: '#f0f9f1',
  },
  classCellText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  classCellTextFilled: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
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

export default AddTimetable;