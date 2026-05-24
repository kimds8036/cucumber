import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../../styles/colors';

// 회원가입 정보 입력 단계: 계정/비밀번호 등 기본 계정정보 입력 화면
const SignStep2 = ({
  styles,
  normalize,
  verifiedName,
  verifiedBirthDate,
  onChange,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const notifyChange = (override = {}) => {
    onChange &&
      onChange({
        name: verifiedName || '',
        birthDate: verifiedBirthDate || '',
        username,
        password,
        passwordConfirm,
        ...override,
      });
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[styles.content, { flex: 1 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: normalize(10),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* 이름 */}
            <Text style={styles.inputLabel}>이름</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.inputReadonly]}
                value={verifiedName || ''}
                editable={false}
                placeholder="본인인증 후 자동 입력"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* 생년월일 */}
            <Text style={styles.inputLabel}>생년월일</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.inputReadonly]}
                value={verifiedBirthDate || ''}
                editable={false}
                placeholder="본인인증 후 자동 입력"
                placeholderTextColor={colors.textSecondary}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default SignStep2;
