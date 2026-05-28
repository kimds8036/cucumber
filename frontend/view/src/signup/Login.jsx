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
import LogoIcon from '../../../assets/Logo.svg';
import { api, setAuthToken } from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import Skeleton from '../../../components/common/Skeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/**
 * [PRE_RELEASE] 회원가입·아이디/비번 찾기: 화면·API는 있으나 navigate 미연결(정식 출시 시 오픈).
 * 복구 시: showPreReleaseAuthFeatureAlert 제거 후 linkContainer에서 navigation.navigate 복원.
 */
const PRE_RELEASE_AUTH_FEATURE_TITLE = '안내';
const PRE_RELEASE_AUTH_FEATURE_MESSAGE =
  '해당 기능은 이미 구현되어 있으나, 아직 로그인 화면과 연결되어 있지 않습니다.\n정식 출시 시 이용하실 수 있습니다.';

function showPreReleaseAuthFeatureAlert() {
  Alert.alert(
    PRE_RELEASE_AUTH_FEATURE_TITLE,
    PRE_RELEASE_AUTH_FEATURE_MESSAGE,
    [{ text: '확인' }],
  );
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
  const [rememberMe, setRememberMe] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
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

  /** 시간표 편집 `scrollAccordionAboveKeyboard`와 같이 포커스 시 입력란이 키보드에 가리지 않도록 */
  const scrollLoginInputsAboveKeyboard = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.assureFocusedInputVisible?.();
    });
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 250);
    return () => clearTimeout(timer);
  }, []);

  if (!screenReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: normalize(24),
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: normalize(28) }}>
            <Skeleton
              width={normalize(120)}
              height={normalize(120)}
              borderRadius={normalize(60)}
            />
            <Skeleton
              width={normalize(130)}
              height={normalize(22)}
              borderRadius={normalize(8)}
              style={{ marginTop: normalize(14) }}
            />
          </View>
          <Skeleton
            width="100%"
            height={normalize(50)}
            borderRadius={normalize(20)}
            style={{ marginBottom: normalize(12) }}
          />
          <Skeleton
            width="100%"
            height={normalize(50)}
            borderRadius={normalize(20)}
            style={{ marginBottom: normalize(12) }}
          />
          <Skeleton
            width={normalize(92)}
            height={normalize(16)}
            borderRadius={normalize(8)}
            style={{ marginBottom: normalize(24) }}
          />
          <Skeleton
            width="95%"
            height={normalize(50)}
            borderRadius={normalize(20)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            ref={scrollRef}
            mode="layout"
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
            scrollEnabled={keyboardOpen}
          >
            {/* 로고 */}
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <LogoIcon
                  width={normalize(100)}
                  height={normalize(100)}
                  color={colors.primary}
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.titleLarge}>YOUTH PAPER</Text>
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
                onFocus={scrollLoginInputsAboveKeyboard}
                autoCapitalize="none"
              />

              {/* 비밀번호 입력 */}
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                onFocus={scrollLoginInputsAboveKeyboard}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 자동 로그인 체크박스 — 체크 시에만 다음 부팅에서 자동로그인 */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              >
                {rememberMe && (
                  <Ionicons
                    name="checkmark"
                    size={normalize(14)}
                    color={colors.background}
                  />
                )}
              </View>
              <Text style={styles.checkboxText}>자동 로그인</Text>
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
                    debugLogin('토큰 저장 시작', { persist: rememberMe });
                    await setAuthToken(token, { persist: rememberMe });
                    debugLogin('토큰 저장 완료');
                  }
                  const onboardingDone = await AsyncStorage.getItem(
                    '@cucumber/onboarding_completed_v1',
                  );
                  const shouldOpenGuide = onboardingDone == null;
                  debugLogin('로그인 상태 반영 → 스택 전환', {
                    shouldOpenGuide,
                  });
                  login({
                    postLoginRoute: shouldOpenGuide ? 'GuideOverlay' : 'Main',
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

            {/* [PRE_RELEASE] 링크 탭 시 미연결 안내 — 복구: navigate('IDfind'|'PWfind'|'Sign') */}
            <View style={styles.linkContainer}>
              <TouchableOpacity onPress={showPreReleaseAuthFeatureAlert}>
                <Text style={styles.linkText}>아이디 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity onPress={showPreReleaseAuthFeatureAlert}>
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity onPress={showPreReleaseAuthFeatureAlert}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
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
