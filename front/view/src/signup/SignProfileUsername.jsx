import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  useWindowDimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
  BackHandler,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import {
  isValidUsername,
  USERNAME_ERROR,
  USERNAME_HINT,
} from '../../../utils/signupValidation';
import { api, getApiUserFacingMessage } from '../../../utils/api';
import { appAlert } from '../../../utils/appAlert';
import { useAuth } from '../../../context/AuthContext';
import SignupPrimaryFooter from './SignupPrimaryFooter';
import AuthScreenShell from './AuthScreenShell';
import AuthTextField from './AuthTextField';

const CHECK_DEBOUNCE_MS = 400;
const USERNAME_TAKEN_MESSAGE = '이미 사용 중인 아이디입니다.';
const USERNAME_AVAILABLE_MESSAGE = '사용 가능한 아이디입니다.';

/**
 * 가입 완료 후 프로필 아이디 설정 — 전체 화면 게이트 (뒤로가기·제스처로 닫히지 않음)
 */
const SignProfileUsername = () => {
  const { markProfileUsernameSet, refreshStudentVerification } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const styles = useMemo(() => createStyles(normalize, width), [normalize, width]);

  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** idle | invalid | checking | available | taken | error */
  const [checkStatus, setCheckStatus] = useState('idle');
  const checkSeqRef = useRef(0);

  const trimmed = username.trim();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!trimmed) {
      setCheckStatus('idle');
      return undefined;
    }
    if (!isValidUsername(trimmed)) {
      setCheckStatus('invalid');
      return undefined;
    }

    setCheckStatus('checking');
    const seq = ++checkSeqRef.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await api.post('/api/auth/check-username-available', {
            username: trimmed,
          });
          if (seq !== checkSeqRef.current) return;
          const available = Boolean(res.data?.data?.available);
          setCheckStatus(available ? 'available' : 'taken');
        } catch (err) {
          if (seq !== checkSeqRef.current) return;
          if (__DEV__) {
            console.warn(
              '[SignProfileUsername] check-username-available failed',
              err?.response?.status,
              err?.response?.data || err?.message,
            );
          }
          setCheckStatus('error');
        }
      })();
    }, CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [trimmed]);

  const canSubmit =
    checkStatus === 'available' && !submitting && isValidUsername(trimmed);

  const helperMessage =
    checkStatus === 'invalid'
      ? USERNAME_ERROR
      : checkStatus === 'taken'
        ? USERNAME_TAKEN_MESSAGE
        : checkStatus === 'available'
          ? USERNAME_AVAILABLE_MESSAGE
          : checkStatus === 'error'
            ? '아이디 확인에 실패했습니다. 다시 입력해 주세요.'
            : checkStatus === 'checking'
              ? '아이디 확인 중…'
              : null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await api.patch('/api/auth/me/username', { username: trimmed });
      markProfileUsernameSet();
      await refreshStudentVerification();
    } catch (error) {
      const message = getApiUserFacingMessage(
        error,
        error?.response?.data?.message ||
          '아이디를 저장하지 못했습니다. 다시 시도해 주세요.',
      );
      if (String(message).includes('이미 사용')) {
        setCheckStatus('taken');
      }
      appAlert.alert('아이디 설정 실패', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          <View style={styles.body}>
            <Text style={styles.title}>
              앱 내에서 사용할{'\n'}프로필 아이디를 입력해 주세요
            </Text>
            <Text style={styles.subtitle}>
              아이디는 로그인 및 친구 검색 시 사용되며{'\n'}
              마이페이지에서 변경 가능합니다
            </Text>

            <AuthTextField
              label="프로필 아이디"
              icon="at-sign"
              value={username}
              onChangeText={(text) => setUsername(text.replace(/\s/g, '_'))}
              placeholder={USERNAME_HINT}
              autoCorrect={false}
              maxLength={20}
              editable={!submitting}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) void handleSubmit();
              }}
              error={
                checkStatus === 'invalid' ||
                checkStatus === 'taken' ||
                checkStatus === 'error'
                  ? helperMessage
                  : ''
              }
              success={
                checkStatus === 'available' || checkStatus === 'checking'
                  ? helperMessage
                  : ''
              }
            />
          </View>
        </Pressable>

        <SignupPrimaryFooter
          label="시작하기"
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          loading={submitting}
        />
      </KeyboardAvoidingView>
    </AuthScreenShell>
  );
};

function createStyles(normalize, width) {
  const gutter = width * 0.04;
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    body: {
      flex: 1,
      paddingHorizontal: gutter,
      paddingTop: normalize(48),
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.heading + 2),
      color: colors.text,
      textAlign: 'left',
      lineHeight: normalize(32),
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
      textAlign: 'left',
      lineHeight: normalize(22),
      marginBottom: normalize(28),
    },
  });
}

export default SignProfileUsername;
