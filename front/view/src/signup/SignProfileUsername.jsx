import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fonts } from '../../../styles/colors';
import {
  isValidUsername,
  USERNAME_ERROR,
  USERNAME_HINT,
} from '../../../utils/signupValidation';
import { api, getApiUserFacingMessage } from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import AppPopupModal from '../../../components/common/AppPopupModal';

const CHECK_DEBOUNCE_MS = 400;
const USERNAME_TAKEN_MESSAGE = '이미 사용 중인 아이디입니다.';
const USERNAME_AVAILABLE_MESSAGE = '사용 가능한 아이디입니다.';

/**
 * 메인 위 강제 팝업 — 배경/뒤로가기로 닫히지 않음.
 * visible: Auth needsProfileUsername
 */
const SignProfileUsername = ({ visible = true }) => {
  const { markProfileUsernameSet, refreshStudentVerification } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** idle | invalid | checking | available | taken | error */
  const [checkStatus, setCheckStatus] = useState('idle');
  const checkSeqRef = useRef(0);

  const trimmed = username.trim();

  useEffect(() => {
    if (!visible) return undefined;
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
  }, [trimmed, visible]);

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

  const helperColor =
    checkStatus === 'available'
      ? colors.primaryDark
      : checkStatus === 'checking'
        ? colors.textSecondary
        : colors.alertDark;

  const handleSubmit = async () => {
    if (!canSubmit) return;
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
      Alert.alert('아이디 설정 실패', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPopupModal
      visible={visible}
      onClose={() => {}}
      dismissOnBackdrop={false}
      dismissOnBackPress={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>
          앱 내에서 사용할{'\n'}프로필 아이디를 입력해 주세요
        </Text>
        <Text style={styles.subtitle}>
          아이디는 로그인 및 친구 검색 시 사용되며 마이페이지에서 변경
          가능합니다
        </Text>

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={(text) => setUsername(text.replace(/\s/g, '_'))}
          placeholder={USERNAME_HINT}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          editable={!submitting}
        />
        {helperMessage ? (
          <Text style={[styles.helperText, { color: helperColor }]}>
            {helperMessage}
          </Text>
        ) : (
          <View style={styles.helperSpacer} />
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canSubmit && styles.primaryButtonDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text style={styles.primaryButtonText}>시작하기</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </AppPopupModal>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(18),
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: normalize(26),
      marginBottom: normalize(10),
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: normalize(14),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
      marginBottom: normalize(16),
    },
    input: {
      height: normalize(48),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(14),
      fontFamily: fonts.regular,
      fontSize: normalize(14),
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    helperText: {
      alignSelf: 'stretch',
      textAlign: 'left',
      paddingHorizontal: normalize(14),
      marginTop: normalize(8),
      fontFamily: fonts.regular,
      fontSize: normalize(12),
      lineHeight: normalize(17),
    },
    helperSpacer: {
      height: normalize(25),
    },
    primaryButton: {
      marginTop: normalize(16),
      height: normalize(48),
      borderRadius: normalize(10),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      fontFamily: fonts.bold,
      fontSize: normalize(14),
      color: colors.textWhite,
    },
  });
}

export default SignProfileUsername;
