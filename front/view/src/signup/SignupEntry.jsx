import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LogoIcon from '../../../assets/Logo.svg';
import { colors } from '../../../styles/colors';
import { createLoginStyles } from '../../../styles/login.style';
import { createSignupEntryStyles } from '../../../styles/signupEntry.style';
import SignupConsentSheet from './SignupConsentSheet';

const SignupEntry = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const loginStyles = useMemo(() => createLoginStyles(width, normalize), [width]);
  const styles = createSignupEntryStyles(normalize);

  const [consentVisible, setConsentVisible] = useState(false);
  const [pendingProvider, setPendingProvider] = useState(null);

  const openConsent = (provider) => {
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
            onPress={() => openConsent('kakao')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="chatbubble"
              size={normalize(20)}
              color="#272A26"
            />
            <Text style={[styles.socialButtonText, styles.kakaoButtonText]}>
              카카오로 시작하기
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={() => openConsent('apple')}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={normalize(22)} color="#fff" />
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>
              Apple로 시작하기
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.phoneButton]}
            onPress={() => openConsent('phone')}
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
