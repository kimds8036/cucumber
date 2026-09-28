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
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  BackHandler,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { createLoginStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import LogoIcon from '../../../assets/Logo.svg';
import kakaoLoginIcon from '../../../assets/kakao_login_icon.png';
import appleLogo from '../../../assets/apple_logo.png';
import AuthScreenShell from './AuthScreenShell';
import AuthCard from './AuthCard';
import AuthTextField from './AuthTextField';
import AuthPrimaryButton from './AuthPrimaryButton';
import {
  api,
  setAuthToken,
  setRefreshToken,
  getOrCreateDeviceId,
  getApiUserFacingMessage,
} from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { loginWithKakao } from '../../../services/kakaoAuth';
import { loginWithApple } from '../../../services/appleAuth';
import { reportInstallOpen } from '../../../utils/appPresence';
import { appAlert } from '../../../utils/appAlert';
import AppPopupModal from '../../../components/common/AppPopupModal';

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
  const [idError, setIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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

  useEffect(() => {
    void reportInstallOpen();
  }, []);

  // 로그인 화면: 하드웨어/제스처 뒤로가기 차단
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => true;
      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBack,
      );
      const unsubBeforeRemove = navigation.addListener('beforeRemove', (e) => {
        if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
          e.preventDefault();
        }
      });
      return () => {
        sub.remove();
        unsubBeforeRemove();
      };
    }, [navigation]),
  );

  const scrollLoginInputsAboveKeyboard = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.assureFocusedInputVisible?.();
    });
  }, []);

  const handleKakaoLogin = useCallback(async () => {
    try {
      const { accessToken } = await loginWithKakao();
      if (!accessToken) {
        appAlert.alert('로그인 실패', '카카오 토큰을 받지 못했습니다.');
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const response = await api.post('/api/auth/oauth/kakao', {
        accessToken,
        deviceId,
      });

      const { token, refreshToken, user, needsVerification } =
        response.data.data || {};
      debugLogin('카카오 로그인 성공', {
        hasToken: Boolean(token),
        user,
        needsVerification,
      });

      if (token) {
        await setAuthToken(token, { persist: true });
        if (refreshToken) {
          await setRefreshToken(refreshToken, { persist: true });
        }
      }
      await login({
        studentVerificationStatus:
          response.data.data?.studentVerificationStatus || 'UNVERIFIED',
        rejectReason: response.data.data?.rejectReason || null,
        reverificationStatus:
          response.data.data?.reverificationStatus || 'none',
        reverificationDeadline:
          response.data.data?.reverificationDeadline || null,
        needsProfileUsername: Boolean(
          response.data.data?.needsProfileUsername,
        ),
      });
    } catch (error) {
      if (error?.code === 'CANCELLED') {
        return;
      }
      const serverCode = error?.response?.data?.code;
      if (serverCode === 'NEEDS_SIGNUP') {
        appAlert.alert(
          '가입 필요',
          '연동된 계정이 없습니다. 카카오로 회원가입을 진행해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '회원가입',
              onPress: () => navigation.navigate('SignupEntry'),
            },
          ],
        );
        return;
      }
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
        const until = formatSuspendedUntil(
          error?.response?.data?.suspendedUntil,
        );
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
      if (
        serverCode === 'GRADUATED_BLOCKED' ||
        serverCode === 'ADULT_BLOCKED' ||
        serverCode === 'REVERIFICATION_RESTRICTED'
      ) {
        const titles = {
          GRADUATED_BLOCKED: {
            title: '이용 제한',
            highlight: '졸업생은 서비스를 이용할 수 없습니다.',
            body:
              '고등학교 졸업으로 Youth Paper 이용이 종료되었습니다.\n' +
              '학생 인증 기반 서비스 정책에 따라 앱 이용이 제한됩니다.',
          },
          ADULT_BLOCKED: {
            title: '이용 제한',
            highlight: '성인은 서비스를 이용할 수 없습니다.',
            body:
              '성인 연령으로 Youth Paper 이용이 종료되었습니다.\n' +
              '학생 인증 기반 서비스 정책에 따라 앱 이용이 제한됩니다.',
          },
          REVERIFICATION_RESTRICTED: {
            title: '재인증 필요',
            highlight: '학생 재인증이 필요합니다.',
            body:
              '새 학년도 재인증 유예 기간이 지났습니다.\n' +
              '앱 이용을 재개하려면 고객센터로 문의해 주세요.',
          },
        };
        const copy = titles[serverCode];
        setPolicyModal({
          visible: true,
          title: copy.title,
          highlight: copy.highlight,
          body: copy.body,
        });
        return;
      }
      appAlert.alert('로그인 실패', buildLoginFailureMessage(error));
    }
  }, [login, navigation]);

  const handleAppleLogin = useCallback(async () => {
    try {
      const { identityToken, isMock } = await loginWithApple();
      if (!identityToken) {
        appAlert.alert('로그인 실패', 'Apple 토큰을 받지 못했습니다.');
        return;
      }
      if (isMock && !__DEV__) {
        appAlert.alert('알림', 'Apple 로그인은 iOS에서만 사용할 수 있습니다.');
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const response = await api.post('/api/auth/oauth/apple', {
        identityToken,
        deviceId,
      });

      const { token, refreshToken } = response.data.data || {};
      if (token) {
        await setAuthToken(token, { persist: true });
        if (refreshToken) {
          await setRefreshToken(refreshToken, { persist: true });
        }
      }
      await login({
        studentVerificationStatus:
          response.data.data?.studentVerificationStatus || 'UNVERIFIED',
        rejectReason: response.data.data?.rejectReason || null,
        reverificationStatus:
          response.data.data?.reverificationStatus || 'none',
        reverificationDeadline:
          response.data.data?.reverificationDeadline || null,
        needsProfileUsername: Boolean(
          response.data.data?.needsProfileUsername,
        ),
      });
    } catch (error) {
      if (error?.code === 'CANCELLED') {
        return;
      }
      if (error?.code === 'APPLE_UNAVAILABLE') {
        appAlert.alert('알림', error.message || 'Apple 로그인을 사용할 수 없습니다.');
        return;
      }
      const serverCode = error?.response?.data?.code;
      if (serverCode === 'NEEDS_SIGNUP') {
        appAlert.alert(
          '가입 필요',
          '연동된 계정이 없습니다. Apple로 회원가입을 진행해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '회원가입',
              onPress: () => navigation.navigate('SignupEntry'),
            },
          ],
        );
        return;
      }
      appAlert.alert(
        '로그인 실패',
        buildLoginFailureMessage(error),
      );
    }
  }, [login, navigation]);

  const handleLogin = useCallback(async () => {
    if (!id || !password) {
      setIdError(!id ? '아이디를 입력해 주세요.' : '');
      setPasswordError(!password ? '비밀번호를 입력해 주세요.' : '');
      return;
    }
    setIdError('');
    setPasswordError('');

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
          response.data.data?.studentVerificationStatus || 'UNVERIFIED',
        rejectReason: response.data.data?.rejectReason || null,
        reverificationStatus:
          response.data.data?.reverificationStatus || 'none',
        reverificationDeadline:
          response.data.data?.reverificationDeadline || null,
        needsProfileUsername: Boolean(
          response.data.data?.needsProfileUsername,
        ),
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
          highlight: '학생 재인증이 필요합니다.',
          body:
            '새 학년도 재인증 유예 기간이 지났습니다.\n' +
            '앱 이용을 재개하려면 고객센터로 문의해 주세요.',
        });
        return;
      }

      appAlert.alert('로그인 실패', buildLoginFailureMessage(error));
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
    <AuthScreenShell>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.body}>
          <KeyboardAwareScrollView
            ref={scrollRef}
            mode="layout"
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.bodyScroll,
              keyboardOpen && styles.bodyScrollKeyboard,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bottomOffset={16}
            scrollEnabled
          >
            <AuthCard>
              <View style={styles.brand}>
                <LogoIcon
                  width={normalize(56)}
                  height={normalize(56)}
                  color={colors.primary}
                />
                <Text style={styles.brandTitle}>Youth Paper</Text>
                <Text style={styles.brandSub}>다시 만나서 반가워요</Text>
              </View>

              <AuthTextField
                icon="user"
                placeholder="아이디"
                value={id}
                error={idError}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(text) => {
                  setId(text);
                  if (idError) setIdError('');
                }}
                onFocus={scrollLoginInputsAboveKeyboard}
                style={styles.fieldGap}
              />
              <AuthTextField
                icon="lock"
                placeholder="비밀번호"
                value={password}
                error={passwordError}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                onFocus={scrollLoginInputsAboveKeyboard}
                style={styles.fieldGap}
              />

              <AuthPrimaryButton
                label="로그인"
                onPress={handleLogin}
                style={styles.loginCta}
              />

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
                  <Image
                    source={kakaoLoginIcon}
                    style={{
                      width: normalize(25),
                      height: normalize(25),
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialCircleButton, styles.appleCircleButton]}
                  onPress={handleAppleLogin}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Apple로 로그인"
                >
                  <Image
                    source={appleLogo}
                    style={{
                      width: normalize(25),
                      height: normalize(35),
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </AuthCard>

            <View style={styles.signupFooter}>
              <Text style={styles.signupFooterText}>
                아직 회원이 아니신가요?{' '}
                <Text
                  style={styles.signupFooterLink}
                  onPress={() => navigation.navigate('SignupEntry')}
                >
                  회원가입
                </Text>
              </Text>
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
        <Text style={styles.policyTitle}>{policyModal.title}</Text>
        <Text style={styles.policyHighlight}>{policyModal.highlight}</Text>
        <Text style={styles.policyBody}>{policyModal.body}</Text>
        <View style={styles.policyActions}>
          <TouchableOpacity
            style={styles.policyOutlineBtn}
            onPress={() => {
              setPolicyModal((prev) => ({ ...prev, visible: false }));
              navigation.navigate('Inquiry', {
                contactUsername: id?.trim() || '',
              });
            }}
          >
            <Text style={styles.policyOutlineText}>문의하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.policyFillBtn}
            onPress={() =>
              setPolicyModal((prev) => ({ ...prev, visible: false }))
            }
          >
            <Text style={styles.policyFillText}>확인</Text>
          </TouchableOpacity>
        </View>
      </AppPopupModal>
    </AuthScreenShell>
  );
};

export default Login;
