import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { createLoginStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import {
  api,
  setAuthToken,
  setRefreshToken,
  getOrCreateDeviceId,
  getApiUserFacingMessage,
} from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import SubHeader from '../../frame/subHeader';

/** 로그인 실패 안내 — 사용자용 문구만 (기술 정보는 __DEV__ 콘솔) */
function buildLoginFailureMessage(error) {
  const userMessage = getApiUserFacingMessage(
    error,
    '아이디 또는 비밀번호를 확인해 주세요.',
  );

  if (__DEV__) {
    console.warn('[Login] failure', {
      baseURL: api.defaults.baseURL,
      status: error?.response?.status,
      code: error?.code,
      data: error?.response?.data,
      message: error?.message,
    });
  }

  return userMessage;
}

function formatSuspendedUntil(raw) {
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

const Login = ({ navigation }) => {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [idFocused, setIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [screenReady] = useState(true);
  const [policyModal, setPolicyModal] = useState({
    visible: false,
    title: '',
    highlight: '',
    body: '',
  });
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef(null);

  const styles = useMemo(() => createLoginStyles(width, normalize), [width]);
  const debugLogin = (...args) => console.log('[LoginDebug]', ...args);

  const scrollLoginInputsAboveKeyboard = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.assureFocusedInputVisible?.();
    });
  }, []);

  const handleKakaoLogin = useCallback(() => {
    Alert.alert('준비 중', '카카오 간편 로그인은 곧 제공될 예정입니다.');
  }, []);

  const handleAppleLogin = useCallback(() => {
    Alert.alert('준비 중', 'Apple 간편 로그인은 곧 제공될 예정입니다.');
  }, []);

  const handleLogin = useCallback(async () => {
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

      const deviceId = await getOrCreateDeviceId();
      const response = await api.post('/api/auth/login', {
        ...loginPayload,
        deviceId,
      });

      const { token, refreshToken, user, needsVerification } =
        response.data.data;
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
        debugLogin('토큰 저장 시작', { persist: true });
        await setAuthToken(token, { persist: true });
        if (refreshToken) {
          await setRefreshToken(refreshToken, { persist: true });
        }
        debugLogin('토큰 저장 완료');
      }
      debugLogin('로그인 상태 반영 → 스택 전환');
      await login({
        studentVerificationStatus:
          response.data.data?.studentVerificationStatus || 'PENDING',
        rejectReason: response.data.data?.rejectReason || null,
        reverificationStatus:
          response.data.data?.reverificationStatus || 'none',
        reverificationDeadline:
          response.data.data?.reverificationDeadline || null,
      });
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

      const serverCode = error?.response?.data?.code;
      const suspendedUntil = error?.response?.data?.suspendedUntil;
      if (serverCode === 'ACCOUNT_BANNED') {
        setPolicyModal({
          visible: true,
          title: '로그인 제한',
          highlight: '영구 정지된 계정입니다.',
          body: '운영정책 위반으로 서비스 이용이 제한되었습니다.\n문의가 필요하면 고객센터로 연락해주세요.',
        });
        return;
      }
      if (serverCode === 'ACCOUNT_DELETED') {
        setPolicyModal({
          visible: true,
          title: '로그인 안내',
          highlight: '탈퇴한 사용자입니다.',
          body: '이미 탈퇴 처리된 계정입니다.\n다시 이용하려면 새로운 아이디로 회원가입해 주세요.',
        });
        return;
      }
      if (serverCode === 'ACCOUNT_SUSPENDED') {
        const until = formatSuspendedUntil(suspendedUntil);
        setPolicyModal({
          visible: true,
          title: '로그인 제한',
          highlight: '임시 정지된 계정입니다.',
          body: until
            ? `해제 예정 시각: ${until}\n해제 시각 이후 다시 로그인해주세요.`
            : '해제 시각 이후 다시 로그인해주세요.',
        });
        return;
      }
      if (serverCode === 'GRADUATED_BLOCKED') {
        setPolicyModal({
          visible: true,
          title: '이용 제한',
          highlight: '졸업생은 서비스를 이용할 수 없습니다.',
          body:
            '고등학교 졸업으로 Youth Paper 이용이 종료되었습니다.\n' +
            '학생 인증 기반 서비스 정책에 따라 앱 이용이 제한됩니다.',
        });
        return;
      }
      if (serverCode === 'ADULT_BLOCKED') {
        setPolicyModal({
          visible: true,
          title: '이용 제한',
          highlight: '성인은 서비스를 이용할 수 없습니다.',
          body:
            '성인 연령으로 Youth Paper 이용이 종료되었습니다.\n' +
            '학생 인증 기반 서비스 정책에 따라 앱 이용이 제한됩니다.',
        });
        return;
      }
      if (serverCode === 'REVERIFICATION_RESTRICTED') {
        setPolicyModal({
          visible: true,
          title: '재인증 필요',
          highlight: '학생증 재인증이 필요합니다.',
          body:
            '새 학년도 재인증 유예 기간이 지났습니다.\n' +
            '앱 이용을 재개하려면 고객센터로 문의해 주세요.',
        });
        return;
      }

      Alert.alert('로그인 실패', buildLoginFailureMessage(error));
    }
  }, [id, password, login]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardOpen(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardOpen(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!keyboardOpen) return;
    requestAnimationFrame(() => {
      scrollRef.current?.assureFocusedInputVisible?.();
    });
  }, [keyboardOpen]);

  if (!screenReady) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SubHeader title="" onBack={() => navigation.goBack()} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.body}>
          <KeyboardAwareScrollView
            ref={scrollRef}
            mode="layout"
            style={{ flex: 1 }}
            contentContainerStyle={styles.bodyScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bottomOffset={16}
            scrollEnabled={keyboardOpen}
          >
            <Text style={styles.screenTitle}>로그인</Text>

            <View style={styles.underlineInputContainer}>
              <TextInput
                style={[
                  styles.underlineInput,
                  idFocused && styles.underlineInputFocused,
                ]}
                placeholder="아이디"
                placeholderTextColor={colors.textSecondary}
                value={id}
                onChangeText={setId}
                onFocus={() => {
                  setIdFocused(true);
                  scrollLoginInputsAboveKeyboard();
                }}
                onBlur={() => setIdFocused(false)}
                autoCapitalize="none"
              />

              <TextInput
                style={[
                  styles.underlineInput,
                  styles.underlineInputSpaced,
                  passwordFocused && styles.underlineInputFocused,
                ]}
                placeholder="비밀번호"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => {
                  setPasswordFocused(true);
                  scrollLoginInputsAboveKeyboard();
                }}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>

            <View style={styles.findLinkContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('IDfind')}>
                <Text style={styles.linkText}>아이디 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PWfind')}>
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.socialDividerRow}>
              <View style={styles.socialDividerLine} />
              <Text style={styles.socialDividerText}>간편 로그인</Text>
              <View style={styles.socialDividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialCircleButton, styles.kakaoCircleButton]}
                onPress={handleKakaoLogin}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="카카오로 로그인"
              >
                <Ionicons
                  name="chatbubble"
                  size={normalize(22)}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialCircleButton, styles.appleCircleButton]}
                onPress={handleAppleLogin}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Apple로 로그인"
              >
                <Ionicons
                  name="logo-apple"
                  size={normalize(24)}
                  color={colors.textWhite}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.signupFooter}>
              <Text style={styles.signupFooterText}>
                아직 회원이 아니신가요?{' '}
                <Text
                  style={styles.signupFooterLink}
                  onPress={() => navigation.popToTop()}
                >
                  회원가입
                </Text>
              </Text>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </TouchableWithoutFeedback>

      <Modal
        visible={policyModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPolicyModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <TouchableWithoutFeedback
          onPress={() =>
            setPolicyModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.38)',
              justifyContent: 'center',
              paddingHorizontal: normalize(24),
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: normalize(14),
                  padding: normalize(18),
                }}
              >
                <Text
                  style={{
                    fontSize: normalize(17),
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: normalize(10),
                  }}
                >
                  {policyModal.title}
                </Text>
                <Text
                  style={{
                    fontSize: normalize(15),
                    fontWeight: '700',
                    color: '#D32F2F',
                    marginBottom: normalize(10),
                  }}
                >
                  {policyModal.highlight}
                </Text>
                <Text
                  style={{
                    fontSize: normalize(14),
                    lineHeight: normalize(20),
                    color: colors.textSecondary,
                  }}
                >
                  {policyModal.body}
                </Text>
                <View
                  style={{
                    marginTop: normalize(16),
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: normalize(8),
                  }}
                >
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: colors.primary,
                      borderRadius: normalize(10),
                      paddingVertical: normalize(8),
                      paddingHorizontal: normalize(14),
                      marginRight: normalize(8),
                    }}
                    onPress={() => {
                      setPolicyModal((prev) => ({ ...prev, visible: false }));
                      navigation.navigate('Inquiry', {
                        contactUsername: id?.trim() || '',
                      });
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      문의하기
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: normalize(10),
                      paddingVertical: normalize(8),
                      paddingHorizontal: normalize(14),
                    }}
                    onPress={() =>
                      setPolicyModal((prev) => ({ ...prev, visible: false }))
                    }
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      확인
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default Login;
