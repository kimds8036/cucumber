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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { createLoginStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import LogoIcon from '../../../assets/Logo.svg';
import { api, setAuthToken, setRefreshToken, getOrCreateDeviceId, getApiUserFacingMessage } from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import AppPopupModal from '../../../components/common/AppPopupModal';
// import Skeleton from '../../../components/common/Skeleton';
// import AsyncStorage from '@react-native-async-storage/async-storage';

import SignupPrepMaterialsModal from './SignupPrepMaterialsModal';

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
  // 부트 스플래시 구간에서 스켈레톤 대신 바로 로그인 UI 표시
  const [screenReady] = useState(true);
  const [policyModal, setPolicyModal] = useState({
    visible: false,
    title: '',
    highlight: '',
    body: '',
  });
  const [prepMaterialsModalVisible, setPrepMaterialsModalVisible] =
    useState(false);
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

  /*
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
  */

  if (!screenReady) return null;

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

            {/* 로그인 버튼 — 토큰은 항상 영속 저장(자동 로그인) */}
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

            <View style={styles.linkContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('IDfind')}
              >
                <Text style={styles.linkText}>아이디 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PWfind')}
              >
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity
                onPress={() => setPrepMaterialsModalVisible(true)}
              >
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </TouchableWithoutFeedback>
      <AppPopupModal
        visible={policyModal.visible}
        onClose={() =>
          setPolicyModal((prev) => ({ ...prev, visible: false }))
        }
        dismissOnBackdrop
      >
        <Text
          style={{
            fontSize: 18,
            color: colors.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          {policyModal.title}
        </Text>
        {!!policyModal.highlight && (
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: '#D32F2F',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {policyModal.highlight}
          </Text>
        )}
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 16,
          }}
        >
          {policyModal.body}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.85}
            onPress={() => {
              setPolicyModal((prev) => ({ ...prev, visible: false }));
              navigation.navigate('Inquiry', {
                contactUsername: id?.trim() || '',
              });
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.primary,
              }}
            >
              문의하기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.85}
            onPress={() =>
              setPolicyModal((prev) => ({ ...prev, visible: false }))
            }
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.textWhite,
              }}
            >
              확인
            </Text>
          </TouchableOpacity>
        </View>
      </AppPopupModal>

      <SignupPrepMaterialsModal
        visible={prepMaterialsModalVisible}
        normalize={normalize}
        onConfirm={() => {
          setPrepMaterialsModalVisible(false);
          navigation.navigate('Sign');
        }}
        onCancel={() => setPrepMaterialsModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default Login;
