import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { colors } from '../../../styles/colors';

const SignStep1 = ({ styles, normalize, onNext }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  // 모달 상태
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);

  // 년도, 월, 일 데이터 생성
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleNext = () => {
    // 추후 유효성 검사 추가
    if (name && username && password && passwordConfirm && birthYear && birthMonth && birthDay) {
      onNext({
        name,
        username,
        password,
        birthday: `${birthYear}-${birthMonth}-${birthDay}`,
      });
    }
  };

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.description}>회원 및 학생 인증에 필요한 중요 정보입니다.</Text>

      {/* 이름 */}
      <Text style={styles.inputLabel}>이름</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* 아이디 */}
      <Text style={styles.inputLabel}>아이디</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      {/* 비밀번호 */}
      <Text style={styles.inputLabel}>비밀번호</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
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
          onChangeText={setPasswordConfirm}
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

      {/* 다음 단계 버튼 */}
      <View style={styles.nextButtonWrapper}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>다음 단계</Text>
        </TouchableOpacity>
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
  );
};

export default SignStep1;
