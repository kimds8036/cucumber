import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LogoIcon from '../../../assets/Logo.svg';
import kakaoLoginIcon from '../../../assets/kakao_login_icon.png';
import { colors } from '../../../styles/colors';
import { createLoginStyles } from '../../../styles/login.style';
import { createSignupEntryStyles } from '../../../styles/signupEntry.style';
import SignupConsentSheet from './SignupConsentSheet';
import { isAppleAuthAvailable } from '../../../services/appleAuth';

const SignupEntry = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const loginStyles = useMemo(() => createLoginStyles(width, normalize), [width]);
  const styles = useMemo(
    () => createSignupEntryStyles(width, normalize),
    [width],
  );

  const [consentVisible, setConsentVisible] = useState(false);
  const [pendingProvider, setPendingProvider] = useState(null);

  const openConsent = async (provider) => {
    if (provider === 'apple') {
      const mockOn =
        String(process.env.EXPO_PUBLIC_APPLE_AUTH_MOCK || '')
          .trim()
          .toLowerCase() === 'true';
      const available = await isAppleAuthAvailable();
      if (!available && !(__DEV__ && mockOn)) {
        Alert.alert(
          'Apple 로그인',
          Platform.OS === 'ios'
            ? '이 기기에서는 Apple 로그인을 사용할 수 없습니다.'
            : 'Apple 로그인은 iOS에서만 사용할 수 있습니다.\nAndroid에서는 카카오 또는 전화번호로 가입해 주세요.',
        );
        return;
      }
    }
    setPendingProvider(provider);
    setConsentVisible(true);
  };

  const handleConsentConfirm = (consentPayload) => {
    setConsentVisible(false);
    const provider = pendingProvider;
    setPendingProvider(null);

    if (provider === 'kakao') {
      navigation.navigate('SignKakao', { consents: consentPayload });
      return;
    }
    if (provider === 'apple') {
      navigation.navigate('SignApple', { consents: consentPayload });
      return;
    }
    if (provider === 'phone') {
      navigation.navigate('SignPhone', { consents: consentPayload });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={loginStyles.logoContainer}>
          <View style={loginStyles.logo}>
            <LogoIcon
              width={normalize(100)}
              height={normalize(100)}
              color={colors.primary}
            />
          </View>
          <View style={loginStyles.titleContainer}>
            <Text style={loginStyles.titleLarge}>YOUTH PAPER</Text>
          </View>
        </View>

        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={[styles.socialButton, styles.kakaoButton]}
            onPress={() => void openConsent('kakao')}
            activeOpacity={0.85}
          >
            <View style={styles.socialButtonContent}>
              <Image
                source={kakaoLoginIcon}
                style={styles.kakaoIcon}
                resizeMode="contain"
              />
              <Text style={[styles.socialButtonText, styles.kakaoButtonText]}>
                카카오로 시작하기
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={() => void openConsent('apple')}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={normalize(22)} color="#fff" />
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>
              Apple로 시작하기
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.phoneButton]}
            onPress={() => void openConsent('phone')}
            activeOpacity={0.85}
          >
            <Text style={[styles.socialButtonText, styles.phoneButtonText]}>
              전화번호로 시작하기
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          이미 계정이 있나요?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('Login')}
          >
            로그인
          </Text>
        </Text>
      </View>

      <SignupConsentSheet
        visible={consentVisible}
        provider={pendingProvider || 'kakao'}
        onClose={() => {
          setConsentVisible(false);
          setPendingProvider(null);
        }}
        onConfirm={handleConsentConfirm}
      />
    </SafeAreaView>
  );
};

export default SignupEntry;
