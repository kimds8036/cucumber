import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

const SignStep4 = ({ styles, normalize, recognizedData, onChange }) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');

  // 학생증에서 인식된 데이터를 자동으로 입력
  useEffect(() => {
    if (recognizedData) {
      setName(recognizedData.name || '');
      setSchool(recognizedData.school || '');
      setGrade(recognizedData.grade || '');
      setClassNum(recognizedData.class || '');
      onChange &&
        onChange({
          name: recognizedData.name || '',
          school: recognizedData.school || '',
          grade: recognizedData.grade || '',
          classNum: recognizedData.class || '',
          graduationYear: recognizedData.graduationYear,
        });
    }
  }, [recognizedData]);

  const notifyChange = (override = {}) => {
    onChange &&
      onChange({
        name,
        school,
        grade,
        classNum,
        ...override,
      });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[styles.content, { flex: 1 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: normalize(40),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
      {/* 이름 */}
      <Text style={styles.inputLabel}>이름</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={(text) => {
            setName(text);
            notifyChange({ name: text });
          }}
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
          onChangeText={(text) => {
            setSchool(text);
            notifyChange({ school: text });
          }}
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
          onChangeText={(text) => {
            setGrade(text);
            notifyChange({ grade: text });
          }}
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
          onChangeText={(text) => {
            setClassNum(text);
            notifyChange({ classNum: text });
          }}
          keyboardType="number-pad"
        />
      </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default SignStep4;
