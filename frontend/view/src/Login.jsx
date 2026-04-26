import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, useWindowDimensions, Platform, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { createLoginStyles } from '../../styles/login.style';
import { colors } from '../../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import LogoIcon from '../../assets/Logo.svg';
import { api, setAuthToken } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

/** --no-dev 등에서도 원인 파악용(Alert 본문) */
function buildLoginFailureMessage(error) {
  const base = api.defaults.baseURL || '(baseURL 없음)';
  const data = error?.response?.data;
  const serverMsg =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data === 'string' ? data : null);
  const axiosMsg = typeof error?.message === 'string' ? error.message : '';
  const code = error?.code;
  const status = error?.response?.status;

  const lines = [];
  if (serverMsg) lines.push(serverMsg);
  else if (axiosMsg) lines.push(axiosMsg);
  else lines.push('로그인 요청에 실패했습니다.');

  if (status != null) lines.push(`HTTP ${status}`);
  if (code) lines.push(`에러 코드: ${code}`);
  lines.push(`API 주소: ${base}`);

  const noResponse = !error?.response && error?.request;
  if (noResponse) {
    lines.push(
      '',
      '서버 응답이 없습니다. Wi‑Fi/데이터, 방화벽, EXPO_PUBLIC_API_URL·apiBaseUrl 설정을 확인하세요.',
    );
  }

  return lines.join('\n');
}

const Login = ({ navigation }) => {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const styles = useMemo(() => createLoginStyles(width, normalize), [width]);
  const debugLogin = (...args) => console.log('[LoginDebug]', ...args);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: normalize(24),
              paddingVertical: normalize(40),
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bottomOffset={16}
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
                  const loginPayload = {
                    username: id,
                    password,
                  };

                  debugLogin('로그인 시도', {
                    baseURL: api.defaults.baseURL,
                    endpoint: '/api/auth/login',
                    username: id,
                    passwordLength: password.length,
                    platform: Platform.OS,
                  });

                  const response = await api.post('/api/auth/login', {
                    ...loginPayload,
                  });

                  const { token, user, needsVerification } = response.data.data;
                  debugLogin('로그인 성공', {
                    status: response.status,
                    success: response.data?.success,
                    message: response.data?.message,
                    hasToken: Boolean(token),
                    tokenPreview: token ? `${token.slice(0, 10)}...` : null,
                    user,
                    needsVerification,
                  });

                  if (token) {
                    debugLogin('토큰 저장 시작');
                    await setAuthToken(token);
                    debugLogin('토큰 저장 완료');
                  }
                  debugLogin('로그인 상태 반영 → Main 스택으로 전환');
                  login();
                } catch (error) {
                  const hasResponse = Boolean(error?.response);
                  const hasRequest = Boolean(error?.request);

                  console.error('[LoginDebug] 로그인 실패', {
                    baseURL: api.defaults.baseURL,
                    endpoint: '/api/auth/login',
                    errorMessage: error?.message,
                    errorCode: error?.code,
                    isAxiosError: error?.isAxiosError,
                    status: error?.response?.status,
                    statusText: error?.response?.statusText,
                    responseData: error?.response?.data,
                    requestInfo: hasRequest
                      ? {
                          timeout: error?.config?.timeout,
                          method: error?.config?.method,
                          url: error?.config?.url,
                        }
                      : null,
                    errorType: hasResponse
                      ? 'SERVER_ERROR'
                      : hasRequest
                        ? 'NETWORK_OR_TIMEOUT'
                        : 'CLIENT_SETUP_ERROR',
                  });

                  Alert.alert('로그인 실패', buildLoginFailureMessage(error));
                }
              }}
            >
              <Text
                style={{
                  fontSize: normalize(17),
                  fontFamily: 'Baloo2-Bold',
                  color: colors.background,
                }}
              >
                로그인
              </Text>
            </TouchableOpacity>

            {/* 링크들 */}
            <View style={styles.linkContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('IDfind')}>
                <Text style={styles.linkText}>아이디 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PWfind')}>
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Sign')}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default Login;
