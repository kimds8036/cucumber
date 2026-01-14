import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../../styles/colors';

const SignStep4 = ({ styles, normalize, onComplete, recognizedData }) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [graduationYear, setGraduationYear] = useState('');

  // 학생증에서 인식된 데이터를 자동으로 입력
  useEffect(() => {
    if (recognizedData) {
      setName(recognizedData.name || '');
      setSchool(recognizedData.school || '');
      setGrade(recognizedData.grade || '');
      setClassNum(recognizedData.class || '');
      setGraduationYear(recognizedData.graduationYear || '');
    }
  }, [recognizedData]);

  const handleComplete = () => {
    // 추후 유효성 검사 추가
    if (name && school && grade && classNum && graduationYear) {
      onComplete({
        name,
        school,
        grade,
        class: classNum,
        graduationYear,
      });
    }
  };

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.description}>
        학생증으로 인증 성공한 학생이신지 틀린 부분이 있다면 수정해주세요
      </Text>

      {/* 이름 */}
      <Text style={styles.inputLabel}>이름</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* 학교 */}
      <Text style={styles.inputLabel}>학교</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="학교"
          placeholderTextColor={colors.textSecondary}
          value={school}
          onChangeText={setSchool}
        />
      </View>

      {/* 학년 */}
      <Text style={styles.inputLabel}>학년</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="학년"
          placeholderTextColor={colors.textSecondary}
          value={grade}
          onChangeText={setGrade}
          keyboardType="number-pad"
        />
      </View>

      {/* 반 */}
      <Text style={styles.inputLabel}>반</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="반"
          placeholderTextColor={colors.textSecondary}
          value={classNum}
          onChangeText={setClassNum}
          keyboardType="number-pad"
        />
      </View>

      {/* 졸업년도 */}
      <Text style={styles.inputLabel}>졸업년도</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="졸업년도"
          placeholderTextColor={colors.textSecondary}
          value={graduationYear}
          onChangeText={setGraduationYear}
          keyboardType="number-pad"
        />
      </View>

      {/* 회원가입 완료 버튼 */}
      <View style={styles.nextButtonWrapper}>
        <TouchableOpacity style={styles.nextButton} onPress={handleComplete}>
          <Text style={styles.nextButtonText}>회원가입</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignStep4;
