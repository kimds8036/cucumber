import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import LogoIcon from '../../../assets/Logo.svg';
import kakaoLoginIcon from '../../../assets/kakao_login_icon.png';
import appleLogo from '../../../assets/apple_logo.png';
import { colors } from '../../../styles/colors';
import { createSignupEntryStyles } from '../../../styles/signupEntry.style';
import SignupConsentSheet from './SignupConsentSheet';
import AuthScreenShell from './AuthScreenShell';
import AuthCard from './AuthCard';
import { isAppleAuthAvailable } from '../../../services/appleAuth';
import { reportInstallOpen } from '../../../utils/appPresence';
import { appAlert } from '../../../utils/appAlert';

const SignupEntry = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const styles = useMemo(
    () => createSignupEntryStyles(width, normalize),
    [width],
  );

  useEffect(() => {
    void reportInstallOpen();
  }, []);

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
        appAlert.alert(
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
      navigation.replace('SignKakao', { consents: consentPayload });
      return;
    }
    if (provider === 'apple') {
      navigation.replace('SignApple', { consents: consentPayload });
      return;
    }
    if (provider === 'phone') {
      navigation.replace('SignPhone', { consents: consentPayload });
    }
  };

  return (
    <AuthScreenShell>
      <View style={styles.center}>
        <AuthCard>
          <View style={styles.brand}>
            <LogoIcon
              width={normalize(56)}
              height={normalize(56)}
              color={colors.primary}
            />
            <Text style={styles.title}>Youth Paper</Text>
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
              <View style={styles.socialButtonContent}>
                <Image
                  source={appleLogo}
                  style={styles.appleIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                  Apple로 시작하기
                </Text>
              </View>
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
        </AuthCard>
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
    </AuthScreenShell>
  );
};

export default SignupEntry;
