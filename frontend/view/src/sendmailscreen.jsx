import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const SendMailScreen = ({ navigation }) => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [searchSchoolText, setSearchSchoolText] = useState('');
  const [showSchoolResults, setShowSchoolResults] = useState(false);
  
  const [recipientType, setRecipientType] = useState('school'); // 'school' or 'student'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchStudentText, setSearchStudentText] = useState('');
  const [showStudentResults, setShowStudentResults] = useState(false);
  
  const [mailContent, setMailContent] = useState('');

  // 더미 데이터
  const schoolResults = [
    { id: 1, name: '서울고등학교', address: '서울시 강남구' },
    { id: 2, name: '서울여자고등학교', address: '서울시 서초구' },
    { id: 3, name: '서울과학고등학교', address: '서울시 종로구' },
  ];

  const studentResults = [
    { id: 1, name: '김민준', grade: 2, class: 3 },
    { id: 2, name: '김서연', grade: 1, class: 5 },
    { id: 3, name: '김지우', grade: 3, class: 2 },
  ];

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school.name);
    setSearchSchoolText(school.name);
    setShowSchoolResults(false);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSearchStudentText(`${student.name} (${student.grade}학년 ${student.class}반)`);
    setShowStudentResults(false);
    setRecipientType('student');
  };

  const handleRecipientTypeChange = (type) => {
    setRecipientType(type);
    if (type === 'school') {
      setSelectedStudent(null);
      setSearchStudentText('');
    }
  };

  const handleSend = () => {
    if (!selectedSchool) {
      Alert.alert('알림', '학교를 선택해주세요.');
      return;
    }
    if (!mailContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    const recipient = recipientType === 'student' && selectedStudent
      ? `${selectedStudent.name} 학생`
      : `${selectedSchool} 전체`;

    Alert.alert(
      '우편 전송',
      `${recipient}에게 우편을 전송하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전송',
          onPress: () => {
            // 여기에 실제 전송 로직
            Alert.alert('완료', '우편이 전송되었습니다.');
            // 초기화
            setMailContent('');
          },
        },
      ]
    );
  };

  const filteredSchools = searchSchoolText
    ? schoolResults.filter(school =>
        school.name.toLowerCase().includes(searchSchoolText.toLowerCase())
      )
    : schoolResults;

  const filteredStudents = searchStudentText
    ? studentResults.filter(student =>
        student.name.toLowerCase().includes(searchStudentText.toLowerCase())
      )
    : studentResults;

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SubHeader title="우편 보내기" onBack={() => navigation?.goBack()} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            {/* 학교 검색 */}
            <View style={styles.section}>
              <Text style={styles.label}>
                보낼 학교 <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="school-outline" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="학교를 검색하세요"
                  value={searchSchoolText}
                  onChangeText={(text) => {
                    setSearchSchoolText(text);
                    setShowSchoolResults(true);
                  }}
                  onFocus={() => setShowSchoolResults(true)}
                  placeholderTextColor="#999"
                />
                {searchSchoolText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchSchoolText('');
                      setSelectedSchool('');
                      setShowSchoolResults(false);
                    }}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 학교 검색 결과 */}
              {showSchoolResults && searchSchoolText && (
                <View style={styles.resultsContainer}>
                  {filteredSchools.length > 0 ? (
                    filteredSchools.map((school) => (
                      <TouchableOpacity
                        key={school.id}
                        style={styles.resultItem}
                        onPress={() => handleSchoolSelect(school)}>
                        <View>
                          <Text style={styles.resultName}>{school.name}</Text>
                          <Text style={styles.resultAddress}>{school.address}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.noResultContainer}>
                      <Text style={styles.noResultText}>검색 결과가 없습니다</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 받는 사람 선택 */}
            {selectedSchool && (
              <View style={styles.section}>
                <Text style={styles.label}>받는 사람</Text>
                
                {/* 받는 사람 타입 선택 */}
                <View style={styles.recipientTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      recipientType === 'school' && styles.typeButtonActive,
                    ]}
                    onPress={() => handleRecipientTypeChange('school')}>
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={recipientType === 'school' ? '#4CAF50' : '#999'}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        recipientType === 'school' && styles.typeButtonTextActive,
                      ]}>
                      학교 전체
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      recipientType === 'student' && styles.typeButtonActive,
                    ]}
                    onPress={() => handleRecipientTypeChange('student')}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={recipientType === 'student' ? '#4CAF50' : '#999'}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        recipientType === 'student' && styles.typeButtonTextActive,
                      ]}>
                      특정 학생
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 특정 학생 검색 */}
                {recipientType === 'student' && (
                  <>
                    <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                      <Ionicons name="person-outline" size={20} color="#999" />
                      <TextInput
                        style={styles.input}
                        placeholder="학생 이름을 검색하세요"
                        value={searchStudentText}
                        onChangeText={(text) => {
                          setSearchStudentText(text);
                          setShowStudentResults(true);
                        }}
                        onFocus={() => setShowStudentResults(true)}
                        placeholderTextColor="#999"
                      />
                      {searchStudentText.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setSearchStudentText('');
                            setSelectedStudent(null);
                            setShowStudentResults(false);
                          }}>
                          <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 학생 검색 결과 */}
                    {showStudentResults && searchStudentText && (
                      <View style={styles.resultsContainer}>
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <TouchableOpacity
                              key={student.id}
                              style={styles.resultItem}
                              onPress={() => handleStudentSelect(student)}>
                              <View style={styles.studentInfo}>
                                <Text style={styles.resultName}>{student.name}</Text>
                                <Text style={styles.resultAddress}>
                                  {student.grade}학년 {student.class}반
                                </Text>
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#999" />
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={styles.noResultContainer}>
                            <Text style={styles.noResultText}>검색 결과가 없습니다</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

                {/* 선택된 받는 사람 표시 */}
                <View style={styles.recipientInfoBox}>
                  <Ionicons name="mail-outline" size={16} color="#666" />
                  <Text style={styles.recipientInfoText}>
                    {recipientType === 'student' && selectedStudent
                      ? `${selectedStudent.name} (${selectedStudent.grade}학년 ${selectedStudent.class}반)`
                      : `${selectedSchool} 우편함`}
                  </Text>
                </View>
              </View>
            )}

            {/* 내용 작성 */}
            {selectedSchool && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  내용 <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.textAreaWrapper}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="보낼 내용을 입력하세요"
                    value={mailContent}
                    onChangeText={setMailContent}
                    multiline
                    textAlignVertical="top"
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.charCount}>{mailContent.length}/500</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* 전송 버튼 */}
          {selectedSchool && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !mailContent.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!mailContent.trim()}>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>전송하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  required: {
    color: '#FF6B6B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 13,
    color: '#666',
  },
  studentInfo: {
    flex: 1,
  },
  noResultContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noResultText: {
    fontSize: 14,
    color: '#999',
  },
  recipientTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  typeButtonTextActive: {
    color: '#4CAF50',
  },
  recipientInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  recipientInfoText: {
    fontSize: 14,
    color: '#666',
  },
  textAreaWrapper: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  textArea: {
    fontSize: 15,
    color: '#333',
    minHeight: 200,
    maxHeight: 300,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SendMailScreen;