import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import {
  isValidUsername,
  USERNAME_ERROR,
  USERNAME_HINT,
} from '../../../utils/signupValidation';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import SignupHelperText from './SignupHelperText';

const SignProfileUsername = () => {
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const [username, setUsername] = useState('');
  const trimmed = username.trim();
  const status =
    !trimmed ? 'idle' : isValidUsername(trimmed) ? 'valid' : 'invalid';
  const canSubmit = isValidUsername(trimmed);

  const handleSubmit = () => {
    if (!canSubmit) return;
    resetTo('Main');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>
          앱 내에서 사용할 프로필 아이디를 입력해 주세요
        </Text>
        <Text style={styles.subtitle}>
          아이디는 로그인 및 친구 검색 시 사용되며 마이페이지에서 변경 가능합니다
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
        />
        <SignupHelperText
          status={status}
          idleMessage={USERNAME_HINT}
          validMessage="사용 가능한 아이디입니다."
          invalidMessage={USERNAME_ERROR}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>시작하기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: normalize(24),
      paddingBottom: normalize(24),
    },
    content: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: fontSizes.xl,
      color: colors.textPrimary,
      lineHeight: normalize(30),
    },
    subtitle: {
      marginTop: normalize(12),
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: normalize(22),
    },
    input: {
      marginTop: normalize(28),
      height: normalize(52),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(12),
      paddingHorizontal: normalize(16),
      fontFamily: fonts.regular,
      fontSize: fontSizes.md,
      color: colors.textPrimary,
    },
    primaryButton: {
      height: normalize(52),
      borderRadius: normalize(12),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      fontFamily: fonts.semibold,
      fontSize: fontSizes.md,
      color: colors.textPrimary,
    },
  });
}

export default SignProfileUsername;
