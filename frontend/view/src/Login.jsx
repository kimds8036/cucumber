import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, useWindowDimensions, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createLoginStyles } from '../../styles/login.style';
import { colors } from '../../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import LogoIcon from '../../assets/Group 166.svg';
import { api, setAuthToken } from '../../utils/api';

const Login = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const styles = useMemo(() => createLoginStyles(width, normalize), [width]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
      {/* 로고 */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <LogoIcon
            width={normalize(140)}
            height={normalize(140)}
            color={colors.primary}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.titleLarge}>오</Text>
          <Text style={styles.titleSmall}>늘의  </Text>
          <Text style={styles.titleLarge}>이</Text>
          <Text style={styles.titleSmall}>야기</Text>
        </View>
      </View>

      {/* 아이디 입력 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="아이디"
          placeholderTextColor={colors.textSecondary}
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
        />

        {/* 비밀번호 입력 */}
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {/* 아이디 저장 체크박스 */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setRememberMe(!rememberMe)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && (
            <Ionicons name="checkmark" size={normalize(14)} color={colors.background} />
          )}
        </View>
        <Text style={styles.checkboxText}>아이디 저장</Text>
      </TouchableOpacity>

      {/* 로그인 버튼 */}
      <TouchableOpacity
        style={{
          width: '95%',
          height: normalize(50),
          backgroundColor: colors.primary,
          borderRadius: normalize(20),
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={async () => {
          if (!id || !password) {
            Alert.alert('알림', '아이디와 비밀번호를 입력해주세요.');
            return;
          }

          try {
            const response = await api.post('/api/auth/login', {
              username: id,
              password,
            });

            const { token, user, needsVerification } = response.data.data;
            console.log('로그인 성공', { token, user, needsVerification });

            if (token) {
              await setAuthToken(token);
            }
            navigation.navigate('Main');
          } catch (error) {
            console.error(error);
            Alert.alert(
              '로그인 실패',
              error.response?.data?.message || '로그인 중 오류가 발생했습니다.',
            );
          }
        }}
      >
        <Text style={{
          fontSize: normalize(17),
          fontFamily: 'Baloo2-Bold',
          color: colors.background,
        }}>
          로그인
        </Text>
      </TouchableOpacity>

      {/* 링크들 */}
      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.linkText}>아이디 찾기</Text>
        </TouchableOpacity>
        <Text style={styles.linkDivider}>|</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.linkText}>비밀번호 찾기</Text>
        </TouchableOpacity>
        <Text style={styles.linkDivider}>|</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Sign')}>
          <Text style={styles.linkText}>회원가입</Text>
        </TouchableOpacity>
      </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default Login;
