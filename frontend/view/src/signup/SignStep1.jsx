import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

const SignStep1 = ({ styles, normalize, onChange }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  const notifyChange = (override = {}) => {
    const birthDate =
      (override.birthYear ?? birthYear) &&
      (override.birthMonth ?? birthMonth) &&
      (override.birthDay ?? birthDay)
        ? `${override.birthYear ?? birthYear}-${override.birthMonth ?? birthMonth}-${override.birthDay ?? birthDay}`
        : '';

    onChange &&
      onChange({
        name,
        username,
        password,
        passwordConfirm,
        birthYear,
        birthMonth,
        birthDay,
        birthDate,
        ...override,
      });
  };

  // 모달 상태
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);

  // 년도, 월, 일 데이터 생성
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  return (
    <SafeAreaView style={{ flex: 1 }}>
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
          value={name}
          onChangeText={(text) => {
            setName(text);
            notifyChange({ name: text });
          }}
        />
      </View>

      {/* 아이디 */}
      <Text style={styles.inputLabel}>아이디</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            notifyChange({ username: text });
          }}
          autoCapitalize="none"
        />
      </View>

      {/* 비밀번호 */}
      <Text style={styles.inputLabel}>비밀번호</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            notifyChange({ password: text });
          }}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {/* 비밀번호 확인 */}
      <Text style={styles.inputLabel}>비밀번호 확인</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={passwordConfirm}
          onChangeText={(text) => {
            setPasswordConfirm(text);
            notifyChange({ passwordConfirm: text });
          }}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {/* 생년월일 */}
      <Text style={styles.inputLabel}>생년월일</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowYearModal(true)}
          >
            <Text style={birthYear ? styles.dropdownText : styles.dropdownPlaceholder}>
              {birthYear || '년'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowMonthModal(true)}
          >
            <Text style={birthMonth ? styles.dropdownText : styles.dropdownPlaceholder}>
              {birthMonth || '월'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDayModal(true)}
          >
            <Text style={birthDay ? styles.dropdownText : styles.dropdownPlaceholder}>
              {birthDay || '일'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 년도 선택 모달 */}
      <Modal
        visible={showYearModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>년도 선택</Text>
              <TouchableOpacity onPress={() => setShowYearModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={years}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setBirthYear(item);
                    notifyChange({ birthYear: item });
                    setShowYearModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    birthYear === item && styles.modalItemTextSelected
                  ]}>
                    {item}년
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 월 선택 모달 */}
      <Modal
        visible={showMonthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>월 선택</Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={months}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setBirthMonth(item);
                    notifyChange({ birthMonth: item });
                    setShowMonthModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    birthMonth === item && styles.modalItemTextSelected
                  ]}>
                    {item}월
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 일 선택 모달 */}
      <Modal
        visible={showDayModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>일 선택</Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={days}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setBirthDay(item);
                    notifyChange({ birthDay: item });
                    setShowDayModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    birthDay === item && styles.modalItemTextSelected
                  ]}>
                    {item}일
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignStep1;
