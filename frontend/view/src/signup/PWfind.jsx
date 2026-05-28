import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { colors } from '../../../styles/colors';
import { createFindStyles } from '../../../styles/find.style';
import Skeleton from '../../../components/common/Skeleton';
import { showComingSoonAuthFeatureAlert } from './authFeatureAlerts';

const PWfind = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);
  const styles = useMemo(() => createFindStyles(width, normalize), [width]);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [step, setStep] = useState(1);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const [screenReady, setScreenReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 220);
    return () => clearTimeout(timer);
  }, []);

  const canCheckUser = name.trim().length > 0 && username.trim().length > 0;
  const canResetPassword =
    newPassword.length > 0 && newPasswordConfirm.length > 0;

  const handleCheckUser = () => {
    showComingSoonAuthFeatureAlert();
  };

  const handleResetPassword = () => {
    showComingSoonAuthFeatureAlert();
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
              width={normalize(96)}
              height={normalize(18)}
              borderRadius={normalize(8)}
            />
          </View>
          <Skeleton
            width="72%"
            height={normalize(14)}
            borderRadius={normalize(6)}
            style={{ marginTop: normalize(10) }}
          />
        </View>
        <View style={styles.contentSection}>
          {[0, 1].map((idx) => (
            <View
              key={`pwfind-skel-${idx}`}
              style={{ marginBottom: normalize(18) }}
            >
              <Skeleton
                width={normalize(70)}
                height={normalize(12)}
                borderRadius={normalize(6)}
                style={{ marginBottom: normalize(8) }}
              />
              <Skeleton
                width="100%"
                height={normalize(48)}
                borderRadius={normalize(12)}
              />
            </View>
          ))}
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
            onPress={() => {
              if (step === 2) {
                setStep(1);
                return;
              }
              navigation.goBack();
            }}
          >
            <Ionicons
              name="chevron-back"
              size={normalize(24)}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 찾기</Text>
        </View>
        <Text style={styles.description}>
          {step === 1
            ? '성함과 아이디를 입력해주세요.'
            : '확인된 사용자 계정의 새 비밀번호를 설정해주세요.'}
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.contentSection}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: normalize(20) }}
          >
            {step === 1 ? (
              <>
                <Text style={styles.inputLabel}>이름</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="이름 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <Text style={styles.inputLabel}>아이디</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="아이디 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>이름</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.inputReadonly]}
                    value={verifiedUser?.name || ''}
                    editable={false}
                  />
                </View>

                <Text style={styles.inputLabel}>아이디</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.inputReadonly]}
                    value={verifiedUser?.username || ''}
                    editable={false}
                  />
                </View>

                <Text style={styles.inputLabel}>새 비밀번호</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="새 비밀번호 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.inputLabel}>새 비밀번호 확인</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="새 비밀번호 다시 입력"
                    placeholderTextColor={colors.textSecondary}
                    value={newPasswordConfirm}
                    onChangeText={setNewPasswordConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <View style={styles.footerSection}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            ((step === 1 && !canCheckUser) ||
              (step === 2 && !canResetPassword)) &&
              styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.9}
          disabled={
            (step === 1 && !canCheckUser) ||
            (step === 2 && !canResetPassword) ||
            checkingUser
          }
          onPress={step === 1 ? handleCheckUser : handleResetPassword}
        >
          <Text style={styles.primaryButtonText}>
            {step === 1
              ? checkingUser
                ? '확인 중...'
                : '다음'
              : '비밀번호 변경'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PWfind;
