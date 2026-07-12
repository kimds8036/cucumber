import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { colors } from '../../../styles/colors';
import { createFindStyles } from '../../../styles/find.style';
import Skeleton from '../../../components/common/Skeleton';
import { api } from '../../../utils/api';
import RecoveryInicisFields from './RecoveryInicisFields';
import SignupStepScroll from './SignupStepScroll';

const IDfind = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = useMemo(() => createFindStyles(width, normalize), [width]);

  const [name, setName] = useState('');
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [inicisClientToken, setInicisClientToken] = useState(null);
  const [verifiedProfile, setVerifiedProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [screenReady, setScreenReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 220);
    return () => clearTimeout(timer);
  }, []);

  const goToLogin = () => {
    navigation?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };

  const resetIdentity = () => {
    setIsIdentityVerified(false);
    setInicisClientToken(null);
    setVerifiedProfile(null);
  };

  const handleInicisVerified = ({
    isVerified,
    inicisClientToken: token,
    profile,
  }) => {
    setIsIdentityVerified(isVerified);
    setInicisClientToken(token);
    setVerifiedProfile(profile);
    if (isVerified && token) {
      void handleFindUsername(token);
    }
  };

  const handleFindUsername = async (tokenOverride) => {
    const clientToken = tokenOverride || inicisClientToken;
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!clientToken) {
      Alert.alert('알림', '본인인증을 먼저 완료해 주세요.');
      return;
    }
    if (!tokenOverride && !isIdentityVerified) {
      Alert.alert('알림', '본인인증을 먼저 완료해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/recovery/find-username', {
        inicisClientToken: clientToken,
        name: name.trim(),
      });
      const foundUsername = res.data?.data?.username;
      if (!foundUsername) {
        Alert.alert('알림', '아이디를 확인하지 못했습니다.');
        return;
      }

      Alert.alert('아이디 확인', `회원님의 아이디는\n\n${foundUsername}\n\n입니다.`, [
        { text: '로그인하기', onPress: goToLogin },
      ]);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        '아이디 찾기 중 오류가 발생했습니다.';
      Alert.alert('알림', msg);
      resetIdentity();
    } finally {
      setSubmitting(false);
    }
  };

  if (!screenReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <Skeleton
              width={normalize(24)}
              height={normalize(24)}
              borderRadius={normalize(12)}
            />
            <Skeleton
              width={normalize(84)}
              height={normalize(18)}
              borderRadius={normalize(8)}
            />
          </View>
        </View>
        <View style={styles.contentSection}>
          <Skeleton
            width="70%"
            height={normalize(14)}
            borderRadius={normalize(6)}
            style={{ marginBottom: normalize(16) }}
          />
          <Skeleton
            width="100%"
            height={normalize(92)}
            borderRadius={normalize(12)}
          />
        </View>
        <View style={styles.footerSection}>
          <Skeleton
            width="100%"
            height={normalize(50)}
            borderRadius={normalize(14)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={normalize(24)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>아이디 찾기</Text>
        </View>
        <Text style={styles.description}>
          가입 시 등록한 이름으로 KG 이니시스 본인인증 후 아이디를 안내해 드립니다.
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.contentSection}>
          <SignupStepScroll normalize={normalize} bottomOffset={100}>
            <Text style={styles.inputLabel}>이름</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="이름 입력"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (isIdentityVerified) resetIdentity();
                }}
                editable={!submitting}
              />
            </View>

            <RecoveryInicisFields
              styles={styles}
              normalize={normalize}
              purpose="find_username"
              name={name}
              isVerified={isIdentityVerified}
              verifiedProfile={verifiedProfile}
              onVerified={handleInicisVerified}
              disabled={submitting}
            />
          </SignupStepScroll>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.footerSection}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!isIdentityVerified || submitting) && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.9}
          disabled={!isIdentityVerified || submitting}
          onPress={() => handleFindUsername()}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? '확인 중...' : '아이디 확인'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default IDfind;
