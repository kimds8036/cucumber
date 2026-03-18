import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { colors } from '../../styles/colors';

const SendMailScreen = ({ navigation }) => {
  const { goBack } = useAppNavigation();
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [searchSchoolText, setSearchSchoolText] = useState('');
  const [showSchoolResults, setShowSchoolResults] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchStudentText, setSearchStudentText] = useState('');
  const [showStudentResults, setShowStudentResults] = useState(false);

  const [mailContent, setMailContent] = useState('');

  const [headerHeight, setHeaderHeight] = useState(0);
  const [schoolSectionHeight, setSchoolSectionHeight] = useState(0);
  const [recipientSectionHeight, setRecipientSectionHeight] = useState(0);
  const [buttonHeight, setButtonHeight] = useState(0);

  const availableSectionHeight = Math.max(
    0,
    height - headerHeight - schoolSectionHeight - recipientSectionHeight - buttonHeight,
  );
  // "서브헤더/학교/받는사람/전송버튼 제외한" 나머지 높이를 그대로 최소 높이로 사용
  const sectionMinHeight = Math.floor(availableSectionHeight);

  // 더미 데이터
  const schoolResults = [
    { id: 1, name: '서울고등학교', address: '서울시 강남구' },
    { id: 2, name: '서울여자고등학교', address: '서울시 서초구' },
    { id: 3, name: '서울과학고등학교', address: '서울시 종로구' },
  ];

  const studentResults = [
    { id: 1, name: '김민준', userId: 'kimminjun', grade: 2, class: 3, isDormant: false },
    { id: 2, name: '김서연', userId: 'kimseoyeon', grade: 1, class: 5, isDormant: false },
    { id: 3, name: '김지우', userId: 'kimjiwoo', grade: 3, class: 2, isDormant: true },
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
    if (!selectedStudent) {
      Alert.alert('알림', '받는 학생을 선택해주세요.');
      return;
    }

    const recipient = `${selectedStudent.name} 학생`;

    Alert.alert(
      '우편 전송',
      `${recipient}에게 우편을 전송하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전송',
          onPress: () => {
            // 여기에 실제 전송 로직
            Alert.alert('완료', '우편이 전송되었습니다.', [
              {
                text: '확인',
                onPress: () => {
                  // 초기화 후 이전 화면(개인 우편함 리스트)으로 복귀
                  setMailContent('');
                  goBack();
                },
              },
            ]);
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
        <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <SubHeader title="우편 보내기" onBack={() => goBack()} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            {/* 학교 검색 */}
            <View
              style={styles.section}
              onLayout={(e) => setSchoolSectionHeight(e.nativeEvent.layout.height)}
            >
              <Text style={styles.label}>
                보낼 학교
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="school-outline" size={normalize(20)} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="학교를 검색하세요"
                  value={searchSchoolText}
                  onChangeText={(text) => {
                    setSearchSchoolText(text);
                    setShowSchoolResults(true);
                  }}
                  onFocus={() => setShowSchoolResults(true)}
                  placeholderTextColor={colors.textSecondary}
                />
                {searchSchoolText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchSchoolText('');
                      setSelectedSchool('');
                      setShowSchoolResults(false);
                    }}>
                    <Ionicons name="close-circle" size={normalize(20)} color={colors.textSecondary} />
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
              <View
                style={styles.section}
                onLayout={(e) => setRecipientSectionHeight(e.nativeEvent.layout.height)}
              >
                <Text style={styles.label}>
                받는 사람
                </Text>
                {/* 학생 이름 검색 */}
                <View style={[styles.inputWrapper]}>
                  <Ionicons name="person-outline" size={normalize(20)} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="학생 이름을 검색하세요"
                    value={searchStudentText}
                    onChangeText={(text) => {
                      setSearchStudentText(text);
                      setShowStudentResults(true);
                    }}
                    onFocus={() => setShowStudentResults(true)}
                      placeholderTextColor={colors.textSecondary}
                  />
                  {searchStudentText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchStudentText('');
                        setSelectedStudent(null);
                        setShowStudentResults(false);
                      }}>
                        <Ionicons name="close-circle" size={normalize(20)} color={colors.textSecondary} />
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
                            <Text style={styles.resultName}>
                              {student.name}
                              {student.userId && (
                                <Text style={styles.resultId}> @{student.userId}</Text>
                              )}
                            </Text>
                            <Text style={styles.resultAddress}>
                              {student.grade}학년 {student.class}반
                            </Text>
                          </View>
                          {student.isDormant && (
                            <View style={styles.dormantBadge}>
                              <Text style={styles.dormantBadgeText}>휴면계정</Text>
                            </View>
                          )}
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
            )}

            {/* 내용 작성 */}
            {selectedSchool && (
              <View style={[styles.section, { minHeight: sectionMinHeight }]}>
                <Text style={styles.label}>
                  내용
                </Text>
                <View style={styles.textAreaWrapper}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="보낼 내용을 입력하세요"
                    value={mailContent}
                    onChangeText={setMailContent}
                    multiline
                    textAlignVertical="top"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.charCount}>{mailContent.length}/500</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* 전송 버튼 */}
          {selectedSchool && (
            <View
              style={styles.buttonContainer}
              onLayout={(e) => setButtonHeight(e.nativeEvent.layout.height)}
            >
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !mailContent.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!mailContent.trim()}
              >
                <Text style={styles.sendButtonText}>전송하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default SendMailScreen;