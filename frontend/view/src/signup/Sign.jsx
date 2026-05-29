import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createSignupStyles } from '../../../styles/login.style';
import { colors } from '../../../styles/colors';
import SignStepConsent from './SignStepConsent';
import SignStepIdentity from './SignStepIdentity';
import SignStep2 from './SignStep2';
import SignStep4 from './SignStep4';
import SignStepVerificationMethod from './SignStepVerificationMethod';
import SignStepCertificate from './SignStepCertificate';
import SignStepNumber from './SignStepNumber';
import SignStepStudentIdVerify from './SignStepStudentIdVerify';
import { api } from '../../../utils/api';
import { useAppNavigation } from '../../../navigation/useAppNavigation';
import Skeleton from '../../../components/common/Skeleton';
import {
  showUnder14BlockAlert,
  showIneligibleAgeAlert,
} from './authFeatureAlerts';
import { getSignupEligibility } from './signupAgeUtils';

const DISABLE_SIGN_VALIDATION_FOR_REDESIGN = true;

/** Target Flow v2 */
const STEP = {
  CONSENT: 0,
  IDENTITY: 1,
  VERIFY_METHOD: 2,
  STUDENT_VERIFY: 3,
  ACCOUNT: 4,
  PROFILE: 5,
};

const Sign = ({ navigation }) => {
  const { resetTo } = useAppNavigation();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const normalize = (size) => Math.round(scale * size);

  const [currentStep, setCurrentStep] = useState(STEP.CONSENT);
  const [formData, setFormData] = useState({});
  const [identityData, setIdentityData] = useState({});
  const [recognizedData, setRecognizedData] = useState(null);
  const [studentVerified, setStudentVerified] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [stepInfoData, setStepInfoData] = useState({});
  const [step4Data, setStep4Data] = useState({});
  const [stepNumberData, setStepNumberData] = useState({});
  const [selectedVerificationMethod, setSelectedVerificationMethod] =
    useState('');
  const [consentData, setConsentData] = useState({ allConsented: false });
  const [completeModalType, setCompleteModalType] = useState('signup');
  const [screenReady, setScreenReady] = useState(false);

  const styles = useMemo(() => createSignupStyles(width, normalize), [width]);

  const isCertificateFlow = selectedVerificationMethod === 'certificate';
  const maxFlowStep = isCertificateFlow ? STEP.ACCOUNT : STEP.PROFILE;

  const progressWidth = (currentStep / maxFlowStep) * 100;
  const isCameraStep =
    currentStep === STEP.STUDENT_VERIFY && !isCertificateFlow;

  const identity = useMemo(
    () => ({
      name: identityData.name || formData.name || '',
      birthDate: identityData.birthDate || formData.birthDate || '',
      phoneNumber: identityData.phoneNumber || formData.phoneNumber || '',
    }),
    [identityData, formData],
  );

  const blockIfIneligibleBirthDate = useCallback(
    (birthDate) => {
      const eligibility = getSignupEligibility(birthDate);
      if (eligibility === 'invalid') {
        Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.');
        return true;
      }
      if (eligibility === 'under14') {
        showUnder14BlockAlert(() => resetTo('Login'));
        return true;
      }
      if (eligibility === 'ineligible') {
        showIneligibleAgeAlert(() => resetTo('Login'));
        return true;
      }
      return false;
    },
    [resetTo],
  );

  const handleBack = () => {
    if (currentStep === STEP.CONSENT) {
      navigation.goBack();
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleConsentNext = () => {
    if (!consentData.allConsented) return;
    setCurrentStep(STEP.IDENTITY);
  };

  const handleIdentityNext = () => {
    const birthDate = identityData.birthDate;
    if (blockIfIneligibleBirthDate(birthDate)) return;

    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
      if (!identityData.name?.trim()) {
        Alert.alert('알림', '이름을 입력해 주세요.');
        return;
      }
      if (!identityData.isVerified) {
        Alert.alert('알림', '전화번호 인증을 완료해 주세요.');
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      name: identityData.name?.trim() || prev.name,
      birthDate,
      phoneNumber: identityData.phoneNumber || prev.phoneNumber,
    }));
    setCurrentStep(STEP.VERIFY_METHOD);
  };

  const handleVerificationMethodNext = () => {
    if (!selectedVerificationMethod) {
      Alert.alert('알림', '학생 인증 방식을 선택해 주세요.');
      return;
    }
    setRecognizedData(null);
    setStudentVerified(false);
    setCurrentStep(STEP.STUDENT_VERIFY);
  };

  const handleStudentVerified = (data) => {
    const school = data?.school || data?.verification?.school;
    const schoolName = school?.name || data?.school;
    const region = school?.region || '';

    setRecognizedData(data);
    setStudentVerified(true);
    setFormData((prev) => ({
      ...prev,
      schoolId: data.schoolId || school?.id,
      schoolName,
      grade: data.grade,
      classNum: data.class,
    }));

    Alert.alert(
      '학교 확인',
      `${schoolName}${region ? `\n${region}` : ''}\n\n이 학교가 맞나요?`,
      [
        {
          text: '다시 촬영',
          style: 'cancel',
          onPress: () => {
            setStudentVerified(false);
            setRecognizedData(null);
          },
        },
        {
          text: '맞아요',
          onPress: () => setCurrentStep(STEP.ACCOUNT),
        },
      ],
    );
  };

  const handleAccountNext = () => {
    if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
      if (
        !stepInfoData.username ||
        !stepInfoData.password ||
        !stepInfoData.passwordConfirm
      ) {
        Alert.alert('알림', '아이디와 비밀번호를 입력해 주세요.');
        return;
      }
      if (stepInfoData.password !== stepInfoData.passwordConfirm) {
        Alert.alert('알림', '비밀번호 확인이 일치하지 않습니다.');
        return;
      }
      if (!studentVerified && selectedVerificationMethod === 'studentId') {
        Alert.alert('알림', '학생증 인증을 완료해 주세요.');
        return;
      }
    }
    setFormData((prev) => ({ ...prev, ...stepInfoData }));
    setCurrentStep(STEP.PROFILE);
  };

  const handleCertificateSubmit = () => {
    if (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber) {
      Alert.alert('알림', '증명서 URL과 접수 번호를 입력해 주세요.');
      return;
    }
    setCompleteModalType('certificate');
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    const finalData = { ...formData, ...step4Data, ...stepInfoData };

    if (DISABLE_SIGN_VALIDATION_FOR_REDESIGN) {
      setCompleteModalType('signup');
      setShowCompleteModal(true);
      return;
    }

    try {
      const payload = {
        username: finalData.username,
        password: finalData.password,
        name: finalData.name || identity.name,
        phone: finalData.phoneNumber || identity.phoneNumber,
        birthDate: finalData.birthDate || identity.birthDate,
        schoolId: finalData.schoolId,
        grade: Number(finalData.grade) || 1,
        classNumber: Number(finalData.classNum) || 1,
        graduationYear:
          finalData.graduationYear ||
          String(new Date().getFullYear() + 1),
        colorId: 1,
      };

      await api.post('/api/auth/signup', payload);
      setCompleteModalType('signup');
      setShowCompleteModal(true);
    } catch (error) {
      Alert.alert(
        '회원가입 실패',
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
      );
    }
  };

  const handleGoToLogin = () => {
    setShowCompleteModal(false);
    resetTo('Login');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        return '약관 동의';
      case STEP.IDENTITY:
        return '본인 확인';
      case STEP.VERIFY_METHOD:
        return '학생 인증 방식';
      case STEP.STUDENT_VERIFY:
        return isCertificateFlow ? '증명서 제출 안내' : '학생증 인증';
      case STEP.ACCOUNT:
        return '계정 정보';
      case STEP.PROFILE:
        return '학생 정보 확인';
      default:
        return '회원가입';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        return '서비스 이용을 위한 필수 동의 항목을 확인해 주세요.';
      case STEP.IDENTITY:
        return '이름·생년월일·전화번호를 입력하고 인증해 주세요.';
      case STEP.VERIFY_METHOD:
        return '학생증 OCR 인증 또는 증명서 제출 중 선택해 주세요.';
      case STEP.STUDENT_VERIFY:
        return isCertificateFlow
          ? '학생증이 없는 경우 증명서 제출 안내를 확인해 주세요.'
          : '학생증을 촬영하면 학교와 학교급을 자동으로 확인합니다.';
      case STEP.ACCOUNT:
        return '아이디와 비밀번호를 설정해 주세요.';
      case STEP.PROFILE:
        return '인증된 정보를 확인한 뒤 가입을 완료해 주세요.';
      default:
        return '';
    }
  };

  const handlePrimaryPress = () => {
    switch (currentStep) {
      case STEP.CONSENT:
        handleConsentNext();
        break;
      case STEP.IDENTITY:
        handleIdentityNext();
        break;
      case STEP.VERIFY_METHOD:
        handleVerificationMethodNext();
        break;
      case STEP.STUDENT_VERIFY:
        if (isCertificateFlow) setCurrentStep(STEP.ACCOUNT);
        break;
      case STEP.ACCOUNT:
        if (isCertificateFlow) handleCertificateSubmit();
        else handleAccountNext();
        break;
      case STEP.PROFILE:
        handleComplete();
        break;
      default:
        break;
    }
  };

  const isPrimaryDisabled = () => {
    if (currentStep === STEP.CONSENT && !consentData.allConsented) return true;
    if (currentStep === STEP.VERIFY_METHOD && !selectedVerificationMethod)
      return true;
    if (currentStep === STEP.IDENTITY) {
      if (!identityData.birthDate) return true;
      if (!DISABLE_SIGN_VALIDATION_FOR_REDESIGN && !identityData.isVerified)
        return true;
    }
    if (
      currentStep === STEP.ACCOUNT &&
      isCertificateFlow &&
      (!stepNumberData.certificateUrl || !stepNumberData.submissionNumber)
    ) {
      return true;
    }
    return false;
  };

  const primaryLabel = () => {
    if (currentStep === STEP.PROFILE) return '회원가입';
    if (currentStep === STEP.ACCOUNT && isCertificateFlow) return '제출하기';
    return '다음 단계';
  };

  useEffect(() => {
    const timer = setTimeout(() => setScreenReady(true), 250);
    return () => clearTimeout(timer);
  }, []);

  if (!screenReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerSection}>
          <Skeleton width={normalize(120)} height={normalize(18)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerSection}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons
                name="chevron-back"
                size={normalize(24)}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getStepTitle()}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${progressWidth}%` }]}
            />
          </View>
          <Text style={styles.description}>{getStepDescription()}</Text>
        </View>
      </View>

      <View style={styles.contentSection}>
        {currentStep === STEP.CONSENT && (
          <SignStepConsent
            normalize={normalize}
            selectedAgeGroup="over14"
            onChange={setConsentData}
          />
        )}
        {currentStep === STEP.IDENTITY && (
          <SignStepIdentity
            styles={styles}
            normalize={normalize}
            onChange={setIdentityData}
            disableValidation={DISABLE_SIGN_VALIDATION_FOR_REDESIGN}
          />
        )}
        {currentStep === STEP.VERIFY_METHOD && (
          <SignStepVerificationMethod
            styles={styles}
            selectedMethod={selectedVerificationMethod}
            onSelect={setSelectedVerificationMethod}
          />
        )}
        {currentStep === STEP.STUDENT_VERIFY &&
          (isCertificateFlow ? (
            <SignStepCertificate styles={styles} />
          ) : (
            <SignStepStudentIdVerify
              styles={styles}
              identity={identity}
              onVerified={handleStudentVerified}
              disableValidation={DISABLE_SIGN_VALIDATION_FOR_REDESIGN}
            />
          ))}
        {currentStep === STEP.ACCOUNT &&
          (isCertificateFlow ? (
            <SignStepNumber
              styles={styles}
              normalize={normalize}
              onChange={setStepNumberData}
            />
          ) : (
            <SignStep2
              styles={styles}
              normalize={normalize}
              verifiedName={identity.name}
              verifiedBirthDate={identity.birthDate}
              onChange={setStepInfoData}
            />
          ))}
        {currentStep === STEP.PROFILE && !isCertificateFlow && (
          <SignStep4
            styles={styles}
            normalize={normalize}
            recognizedData={recognizedData}
            onChange={setStep4Data}
          />
        )}
      </View>

      {!isCameraStep && (
        <View style={styles.footerSection}>
          <View style={styles.bottomButtonContainer}>
            <View style={styles.nextButtonWrapper}>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  isPrimaryDisabled() && {
                    backgroundColor: colors.textLight20,
                  },
                ]}
                activeOpacity={0.9}
                disabled={isPrimaryDisabled()}
                onPress={handlePrimaryPress}
              >
                <Text style={styles.nextButtonText}>{primaryLabel()}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: colors.textSecondary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '85%',
              backgroundColor: colors.background,
              borderRadius: normalize(20),
              padding: normalize(25),
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: normalize(20),
                fontFamily: 'Baloo2-Bold',
                color: colors.textPrimary,
                marginBottom: normalize(10),
              }}
            >
              {completeModalType === 'certificate' ? '제출 성공' : '회원가입 성공'}
            </Text>
            <Text
              style={{
                fontSize: normalize(14),
                fontFamily: 'Baloo2-Regular',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: normalize(16),
              }}
            >
              {completeModalType === 'certificate'
                ? '증명서 제출이 완료되었습니다.'
                : '회원가입이 완료되었습니다!'}
            </Text>
            <TouchableOpacity
              style={{
                width: '100%',
                height: normalize(45),
                backgroundColor: colors.primary,
                borderRadius: normalize(24),
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleGoToLogin}
            >
              <Text
                style={{
                  fontSize: normalize(16),
                  fontFamily: 'Baloo2-Bold',
                  color: colors.background,
                }}
              >
                확인
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Sign;
